"""Small renderer entry point; no API, database or provider initialization."""

import json
import math
import sys
from pathlib import Path


def render(
    source: Path, target: Path, page_number: int, rect: tuple[float, float, float, float]
) -> None:
    import pymupdf
    from PIL import Image

    x, y, crop_width, crop_height = rect
    if (
        not all(math.isfinite(value) for value in rect)
        or min(x, y) < 0
        or min(crop_width, crop_height) <= 0
        or x + crop_width > 1.00001
        or y + crop_height > 1.00001
    ):
        raise ValueError("Invalid crop")
    with pymupdf.open(source) as document:
        if not document.is_pdf or document.needs_pass or not 1 <= page_number <= len(document):
            raise ValueError("A readable PDF page is required.")
        page = document[page_number - 1]
        width, height = page.rect.width, page.rect.height
        if not all(math.isfinite(value) and value > 0 for value in (width, height)):
            raise ValueError("Invalid page dimensions")
        scale = min(2, 2048 / max(width, height))
        pixmap = page.get_pixmap(
            matrix=pymupdf.Matrix(scale, scale), colorspace=pymupdf.csRGB, alpha=False, annots=False
        )
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        box = (
            int(x * image.width),
            int(y * image.height),
            min(image.width, math.ceil((x + crop_width) * image.width)),
            min(image.height, math.ceil((y + crop_height) * image.height)),
        )
        if box[2] - box[0] < 2 or box[3] - box[1] < 2:
            raise ValueError("Select a larger area.")
        image.crop(box).save(target, format="PNG")


if __name__ == "__main__":
    raw = json.loads(sys.argv[4])
    if not isinstance(raw, list) or len(raw) != 4:
        raise ValueError("Invalid crop")
    render(
        Path(sys.argv[1]),
        Path(sys.argv[2]),
        int(sys.argv[3]),
        (float(raw[0]), float(raw[1]), float(raw[2]), float(raw[3])),
    )
