from uuid import RFC_4122  # [LEFTOVER FIX]

import pytest  # [LEFTOVER FIX]

from app.core import ids  # [LEFTOVER FIX]


def test_uuid7_has_rfc_layout_and_millisecond_order(  # [LEFTOVER FIX]
    monkeypatch: pytest.MonkeyPatch,  # [LEFTOVER FIX]
) -> None:  # [LEFTOVER FIX]
    ticks = iter([1_700_000_000_000_000_000, 1_700_000_000_001_000_000])  # [LEFTOVER FIX]
    monkeypatch.setattr(ids, "time_ns", lambda: next(ticks))  # [LEFTOVER FIX]
    first, second = ids.uuid7(), ids.uuid7()  # [LEFTOVER FIX]
    assert first.version == second.version == 7  # [LEFTOVER FIX]
    assert first.variant == second.variant == RFC_4122  # [LEFTOVER FIX]
    assert first.int >> 80 == 1_700_000_000_000  # [LEFTOVER FIX]
    assert second.int >> 80 == 1_700_000_000_001  # [LEFTOVER FIX]
    assert first < second  # [LEFTOVER FIX]


def test_uuid7_retains_random_bits_in_the_same_millisecond(  # [LEFTOVER FIX]
    monkeypatch: pytest.MonkeyPatch,  # [LEFTOVER FIX]
) -> None:  # [LEFTOVER FIX]
    monkeypatch.setattr(ids, "time_ns", lambda: 1_700_000_000_000_000_000)  # [LEFTOVER FIX]
    assert len({ids.uuid7() for _ in range(100)}) == 100  # [LEFTOVER FIX]
