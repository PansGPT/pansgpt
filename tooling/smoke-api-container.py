"""Check the real container process without credentials or external AI calls."""

import json
import time
import urllib.error
import urllib.request


def read(path: str) -> tuple[int, dict[str, object]]:
    try:
        response = urllib.request.urlopen("http://127.0.0.1:18000" + path, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.code, json.load(response)


deadline = time.monotonic() + 60
while True:
    try:
        status, live = read("/health/live")
        assert status == 200 and live["status"] == "ok"
        break
    except (OSError, AssertionError):
        if time.monotonic() >= deadline:
            raise
        time.sleep(1)

status, infrastructure = read("/health/infrastructure")
assert status == 503, "Missing database credentials must fail infrastructure health"
status, readiness = read("/health/ready")
assert status == 503, "Missing provider eligibility must fail product readiness"
assert readiness["engines"]["chat"] == "blocked"
assert readiness["engines"]["embeddings"] == "blocked"
print(
    "Container liveness passed; missing dependencies and provider eligibility fail closed."
)
