"""Bounded single-byte-range parsing for private PDF delivery."""

import re

from fastapi import HTTPException


def pdf_byte_range(value: str | None, size: int) -> tuple[int, int] | None:
    if value is None:
        return None
    match = re.fullmatch(r"bytes=(\d{0,20})-(\d{0,20})", value.strip())
    if match and size > 0:
        first, last = match.groups()
        if first:
            start = int(first)
            end = min(int(last), size - 1) if last else size - 1
            if start <= end and start < size:
                return start, end
        elif last and int(last) > 0:
            return max(0, size - int(last)), size - 1
    raise HTTPException(
        416,
        "Requested PDF byte range is not available.",
        headers={"Content-Range": f"bytes */{size}", "Cache-Control": "private, no-store"},
    )
