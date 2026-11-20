"""Bounded public model download and atomic, cross-process cache publication."""

import shutil
import stat
import tempfile
import time
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any, Literal

import requests
import structlog
from filelock import FileLock

from app.core.diagnostics import error_fields

logger = structlog.get_logger(__name__)

MAX_ARCHIVE_BYTES = 64 * 1024 * 1024
MAX_EXPANDED_BYTES = 256 * 1024 * 1024


def _default_cache(module_path: Path) -> Path:
    # Local checkouts retain their cache across reloads. Installed/container
    # layouts may have fewer ancestors and use a writable temporary fallback.
    workspace = next(
        (parent for parent in module_path.parents if (parent / "pnpm-workspace.yaml").is_file()),
        None,
    )
    if workspace is not None:
        return workspace / ".cache" / "flashrank"
    return Path(tempfile.gettempdir()) / "pansgpt" / "flashrank"


DEFAULT_CACHE = _default_cache(Path(__file__).resolve())


class ModelCacheError(ValueError):
    def __init__(
        self,
        reason: Literal[
            "model_unsupported",
            "model_cache_incomplete",
            "model_archive_limit",
            "model_archive_path",
            "model_package_incomplete",
        ],
        message: str,
    ) -> None:
        super().__init__(message)
        self.reason = reason


def prepare_cache(model_name: str, cache_dir: str | None) -> Path:
    from flashrank.Config import listwise_rankers, model_file_map, model_url

    if model_name not in model_file_map or model_name in listwise_rankers:
        raise ModelCacheError("model_unsupported", "Unsupported local cross-encoder model")
    root = Path(cache_dir) if cache_dir else DEFAULT_CACHE
    root.mkdir(parents=True, exist_ok=True)
    required = (
        model_file_map[model_name],
        "config.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
        "tokenizer.json",
    )

    def complete(directory: Path) -> bool:
        return all(
            (directory / name).is_file() and (directory / name).stat().st_size > 0
            for name in required
        )

    target = root / model_name
    # Deployment images ship a complete, read-only cache. Reading it must not
    # require creating a lock file as the non-root runtime user. Downloads are
    # published atomically; only preparation needs the cross-process lock.
    if complete(target):
        return root

    with FileLock(str(root / (model_name + ".lock")), timeout=0):
        if complete(target):
            return root
        if target.exists():
            # Preserve unexpected/corrupt pre-existing files for inspection.
            raise ModelCacheError(
                "model_cache_incomplete",
                "Incomplete model cache; provision a clean cache directory",
            )
        with tempfile.TemporaryDirectory(prefix=".download-", dir=root) as private:
            staging = Path(private)
            archive = staging / "model.zip"
            started, total = time.monotonic(), 0
            phase = "response_headers"
            logger.info("flashrank_download_started", model=model_name)
            try:
                with requests.get(
                    model_url.format(model_name), stream=True, timeout=(5, 15)
                ) as response:
                    response.raise_for_status()
                    phase = "response_body"
                    with archive.open("wb") as destination:
                        for chunk in response.iter_content(128 * 1024):
                            total += len(chunk)
                            if total > MAX_ARCHIVE_BYTES or time.monotonic() - started > 90:
                                raise TimeoutError(
                                    "Public model download exceeded its resource budget"
                                )
                            destination.write(chunk)
            except Exception as exc:
                logger.warning(
                    "flashrank_download_failed",
                    phase=phase,
                    downloaded_bytes=total,
                    elapsed_ms=round((time.monotonic() - started) * 1000),
                    **error_fields(exc),
                )
                raise
            with zipfile.ZipFile(archive) as package:
                members = package.infolist()
                if (
                    len(members) > 128
                    or sum(item.file_size for item in members) > MAX_EXPANDED_BYTES
                ):
                    raise ModelCacheError(
                        "model_archive_limit", "Model archive exceeds extraction limits"
                    )
                for item in members:
                    relative = PurePosixPath(item.filename.replace("\\", "/"))
                    if (
                        relative.is_absolute()
                        or ".." in relative.parts
                        or not relative.parts
                        or stat.S_ISLNK(item.external_attr >> 16)
                    ):
                        raise ModelCacheError("model_archive_path", "Unsafe model archive path")
                    # Official FlashRank ZIPs include macOS resource-fork metadata.
                    # Validate its path/type above, then skip it without extraction.
                    if relative.parts[0] == "__MACOSX":
                        continue
                    if relative.parts[0] != model_name:
                        raise ModelCacheError("model_archive_path", "Unsafe model archive path")
                    destination = staging.joinpath(*relative.parts)
                    if not destination.resolve().is_relative_to(staging.resolve()):
                        raise ModelCacheError(
                            "model_archive_path", "Unsafe model archive destination"
                        )
                    if item.is_dir():
                        destination.mkdir(parents=True, exist_ok=True)
                    else:
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        with package.open(item) as source, destination.open("wb") as output:
                            shutil.copyfileobj(source, output, 128 * 1024)
            source = staging / model_name
            if not complete(source):
                raise ModelCacheError(
                    "model_package_incomplete", "Public model package is incomplete"
                )
            source.replace(target)
        return root


def load_ranker(model_name: str, cache_dir: str | None) -> Any:
    from flashrank import Ranker

    root = prepare_cache(model_name, cache_dir)
    # The SDK only sees a complete model directory: no unbounded SDK download.
    return Ranker(model_name=model_name, cache_dir=str(root))
