"""Per-model cooldowns prevent repeatedly exhausting an unhealthy provider."""

import time


class ModelCircuits:
    def __init__(self, threshold: int = 3, cooldown: float = 60) -> None:
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures: dict[str, tuple[int, float]] = {}
        self.probes: dict[str, float] = {}

    def available(self, model: str) -> bool:
        count, at = self.failures.get(model, (0, 0))
        if count < self.threshold:
            return True
        now = time.monotonic()
        if now - at < self.cooldown or now - self.probes.get(model, -1e9) < 30:
            return False
        self.probes[model] = now
        return True

    def failed(self, model: str) -> None:
        count, _ = self.failures.get(model, (0, 0))
        self.failures[model] = (count + 1, time.monotonic())
        self.probes.pop(model, None)

    def succeeded(self, model: str) -> None:
        self.failures.pop(model, None)
        self.probes.pop(model, None)
