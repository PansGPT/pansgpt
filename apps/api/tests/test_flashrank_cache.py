"""Public model packages publish atomically; test files are synthetic, not models."""

import io
import stat
import zipfile
from unittest.mock import MagicMock

import pytest
import requests

from app.engines import flashrank_cache as cache

MODEL = "ms-marco-TinyBERT-L-2-v2"


def package(extra=None, *, macos_metadata=False):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        for name in (
            "flashrank-TinyBERT-L-2-v2.onnx",
            "config.json",
            "tokenizer_config.json",
            "special_tokens_map.json",
            "tokenizer.json",
        ):
            archive.writestr(f"{MODEL}/{name}", "synthetic test data")
            if macos_metadata:
                archive.writestr(f"__MACOSX/{MODEL}/._{name}", "synthetic resource fork")
        if macos_metadata:
            archive.writestr(f"__MACOSX/._{MODEL}", "synthetic resource fork")
        if extra:
            archive.writestr(extra, "invalid")
    return stream.getvalue()


def response(data):
    result = MagicMock()
    result.__enter__.return_value = result
    result.iter_content.return_value = [data]
    return result


def test_complete_cache_is_reused_without_redownload(tmp_path, monkeypatch):
    get = MagicMock(return_value=response(package()))
    monkeypatch.setattr(cache.requests, "get", get)
    assert cache.prepare_cache(MODEL, str(tmp_path)) == tmp_path
    assert cache.prepare_cache(MODEL, str(tmp_path)) == tmp_path
    get.assert_called_once()
    assert get.call_args.kwargs["timeout"] == (5, 15)
    assert (tmp_path / MODEL / "tokenizer.json").is_file()
    assert not list(tmp_path.glob(".download-*"))


def test_official_package_macos_metadata_is_ignored(tmp_path, monkeypatch):
    # Synthetic contents reproduce the observed public ZIP's packaging layout.
    monkeypatch.setattr(
        cache.requests, "get", MagicMock(return_value=response(package(macos_metadata=True)))
    )
    assert cache.prepare_cache(MODEL, str(tmp_path)) == tmp_path
    assert (tmp_path / MODEL / "tokenizer.json").is_file()
    assert not (tmp_path / "__MACOSX").exists()
    assert not list((tmp_path / MODEL).glob("._*"))


@pytest.mark.parametrize(
    "extra",
    [
        "../escaped",
        "/absolute",
        "other-model/file",
        f"{MODEL}/../../escape",
        "__MACOSX/../../escape",
        "__MACOSX/../escape",
    ],
)
def test_unsafe_archive_never_publishes_or_escapes(tmp_path, monkeypatch, extra):
    monkeypatch.setattr(cache.requests, "get", MagicMock(return_value=response(package(extra))))
    with pytest.raises(ValueError, match="Unsafe"):
        cache.prepare_cache(MODEL, str(tmp_path))
    assert not (tmp_path / MODEL).exists()
    assert not list(tmp_path.glob(".download-*"))


def test_interrupted_download_has_no_partial_visible_model_and_can_retry(tmp_path, monkeypatch):
    interrupted = response(b"")
    interrupted.iter_content.side_effect = requests.Timeout("Synthetic interruption")
    monkeypatch.setattr(
        cache.requests, "get", MagicMock(side_effect=[interrupted, response(package())])
    )
    with pytest.raises(requests.Timeout):
        cache.prepare_cache(MODEL, str(tmp_path))
    assert not (tmp_path / MODEL).exists()
    assert cache.prepare_cache(MODEL, str(tmp_path)) == tmp_path


@pytest.mark.parametrize("limit", ["MAX_ARCHIVE_BYTES", "MAX_EXPANDED_BYTES"])
def test_model_package_resource_limits(tmp_path, monkeypatch, limit):
    monkeypatch.setattr(cache, limit, 1)
    monkeypatch.setattr(cache.requests, "get", MagicMock(return_value=response(package())))
    with pytest.raises((TimeoutError, ValueError)):
        cache.prepare_cache(MODEL, str(tmp_path))
    assert not (tmp_path / MODEL).exists()


def test_unknown_model_is_rejected_before_network(tmp_path, monkeypatch):
    get = MagicMock()
    monkeypatch.setattr(cache.requests, "get", get)
    with pytest.raises(ValueError):
        cache.prepare_cache("../../arbitrary", str(tmp_path))
    get.assert_not_called()


@pytest.mark.parametrize("name", [f"{MODEL}/linked", f"__MACOSX/._{MODEL}"])
def test_symlinks_are_rejected_even_in_skipped_metadata(tmp_path, monkeypatch, name):
    stream = io.BytesIO(package())
    with zipfile.ZipFile(stream, "a") as archive:
        entry = zipfile.ZipInfo(name)
        entry.create_system = 3
        entry.external_attr = (stat.S_IFLNK | 0o777) << 16
        archive.writestr(entry, "../outside")
    monkeypatch.setattr(cache.requests, "get", MagicMock(return_value=response(stream.getvalue())))
    with pytest.raises(cache.ModelCacheError) as caught:
        cache.prepare_cache(MODEL, str(tmp_path))
    assert caught.value.reason == "model_archive_path"
    assert not (tmp_path / MODEL).exists()
