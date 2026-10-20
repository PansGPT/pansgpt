"""Offline deployment contracts for the Docker runtime."""

import json
import re
import shlex
from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"


def test_runtime_python_user_packages_match_user_home() -> None:
    dockerfile = DOCKERFILE.read_text(encoding="utf-8")
    home = re.search(r"useradd[^\n]* -d (\S+)", dockerfile)
    copied = re.search(r"COPY --from=builder /root/\.local (\S+)", dockerfile)
    assert home is not None
    assert copied is not None
    assert copied.group(1) == home.group(1) + "/.local", (
        "Python's user package directory must match the runtime user's home."
    )
    assert f"ENV PATH={copied.group(1)}/bin:$PATH" in dockerfile


def test_healthcheck_executable_is_installed_in_runtime() -> None:
    dockerfile = DOCKERFILE.read_text(encoding="utf-8")
    runner = dockerfile.split("AS runner", 1)[1]
    command = runner.split("HEALTHCHECK", 1)[1].split("CMD ", 1)[1].splitlines()[0]
    executable = json.loads(command)[0] if command.startswith("[") else shlex.split(command)[0]
    apt_packages = set()
    for instruction in re.findall(r"RUN .*?(?=\n\n|\Z)", runner, re.DOTALL):
        if "apt-get install" in instruction:
            apt_packages.update(instruction.replace("\\\n", " ").split())
    assert executable in {"python", "python3"} | apt_packages, (
        "Docker healthcheck must use a binary guaranteed by the runtime image."
    )
    assert "/health/live" in command
