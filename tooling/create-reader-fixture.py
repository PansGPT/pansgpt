"""Regenerate the synthetic, non-clinical PDF used by reader browser contracts."""

import io
from pathlib import Path

import pymupdf as fitz
from PIL import Image

target = Path(__file__).resolve().parents[1] / "apps/web/tests/chat/fixtures/synthetic-reader.pdf"
pdf = fitz.open()
sample = Image.new("RGB", (150, 24))
for x in range(150):
    for y in range(24):
        sample.putpixel(
            (x, y), (216, 44, 44) if x < 50 else (24, 116, 210) if x < 100 else (35, 150, 95)
        )
image_data = io.BytesIO()
sample.save(image_data, format="PNG")
for number in range(1, 25):
    page = pdf.new_page(
        width=792 if number % 5 == 0 else 612, height=612 if number % 5 == 0 else 792
    )
    page.draw_rect(fitz.Rect(42, 42, page.rect.width - 42, 47), fill=(0.35, 0.47, 0.42), color=None)
    page.insert_text(
        (48, 77),
        "PANSGPT / SYNTHETIC STUDY MATERIAL",
        fontsize=9,
        color=(0.35, 0.4, 0.38),
    )
    page.insert_text(
        (48, 132),
        f"Receptors and responses — {number}",
        fontsize=23,
        color=(0.14, 0.18, 0.16),
    )
    page.insert_textbox(
        fitz.Rect(48, 163, page.rect.width - 55, 233),
        "A fictional signal reaches a fictional receptor. The response depends on the model. "
        "Select this passage to ask a question and return to its source page.",
        fontsize=12,
        lineheight=1.6,
    )
    page.insert_text((48, 283), "01   Make a connection", fontsize=15)
    page.insert_image(fitz.Rect(48, 236, 180, 258), stream=image_data.getvalue())
    page.insert_text((190, 250), "SYNTHETIC COLOR SAMPLE", fontsize=7)
    page.insert_textbox(
        fitz.Rect(48, 310, page.rect.width - 55, 395),
        "Compare the first concept with the second concept. Describe how the two ideas relate. "
        "Use the selected passage as your starting point, then explain the connection in your own words.",
        fontsize=11,
        lineheight=1.6,
    )
    page.insert_text((48, 447), "02   Pause and recall", fontsize=15)
    page.insert_textbox(
        fitz.Rect(48, 474, page.rect.width - 55, 548),
        "Which idea matters most on this page? What would help you remember it? "
        "This document contains invented teaching content for interface tests only.",
        fontsize=11,
        lineheight=1.6,
    )
    page.insert_text(
        (48, page.rect.height - 34),
        f"SYNTHETIC SAMPLE / NOT CLINICAL GUIDANCE                                      {number:02d}",
        fontsize=8,
        color=(0.5, 0.5, 0.5),
    )
pdf.save(target, deflate=True)
pdf.close()
print(target.name)
