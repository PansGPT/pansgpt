import assert from "node:assert/strict";
import test from "node:test";
import { searchPreviewText } from "../lib/search-preview.ts";

test("search previews show readable Markdown content without headings, emphasis, links or list syntax", () => {
  assert.equal(
    searchPreviewText(
      "## **Bioavailability**\n\n1. *Absorption* &amp; __distribution__\n2. [Clearance](https://example.test) and ~~old wording~~"
    ),
    "Bioavailability Absorption & distribution Clearance and old wording"
  );
  assert.equal(searchPreviewText("bio**availability** and V_d"), "bioavailability and V_d");
});

test("tables, code and images preserve useful text while executable HTML and destinations stay out", () => {
  assert.equal(
    searchPreviewText("| Drug | Route |\n| --- | --- |\n| A | Oral |"),
    "Drug Route A Oral"
  );
  assert.equal(searchPreviewText("```text\n**literal code**\n```"), "**literal code**");
  assert.equal(
    searchPreviewText("![Course diagram](https://example.test/private.png)"),
    "Course diagram"
  );
  assert.equal(searchPreviewText('<script>alert("x")</script>\n\n**Safe text**'), "Safe text");
  assert.equal(searchPreviewText("[Click](javascript:alert)"), "Click");
});

test("cropped emphasis is cleaned without changing in-word underscores, powers or currency", () => {
  assert.equal(searchPreviewText("…**Clearance and half-life…"), "…Clearance and half-life…");
  assert.equal(searchPreviewText("…clearance** and dosing…"), "…clearance and dosing…");
  assert.equal(searchPreviewText("V_d and power**2, $20 and $30"), "V_d and power**2, $20 and $30");
});
