from secrets import token_bytes  # [LEFTOVER FIX]
from time import time_ns  # [LEFTOVER FIX]
from uuid import UUID  # [LEFTOVER FIX]


def uuid7() -> UUID:  # [LEFTOVER FIX]
    """Generate RFC 9562 UUIDv7, matching the database UUID layout. [LEFTOVER FIX]"""
    milliseconds = time_ns() // 1_000_000  # [LEFTOVER FIX]
    value = bytearray(milliseconds.to_bytes(6, "big") + token_bytes(10))  # [LEFTOVER FIX]
    value[6] = (value[6] & 0x0F) | 0x70  # [LEFTOVER FIX]
    value[8] = (value[8] & 0x3F) | 0x80  # [LEFTOVER FIX]
    return UUID(bytes=bytes(value))  # [LEFTOVER FIX]
