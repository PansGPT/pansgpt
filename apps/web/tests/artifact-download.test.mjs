import assert from "node:assert/strict";
import test from "node:test";
import { artifactDownload, artifactDownloadError } from "../lib/artifact-download.ts";

const key =
  "artifacts/018f3a10-0001-7000-8000-000000000001/018f3a10-0001-7000-8000-000000000002/pptx/synthetic.pptx";
const base = "https://api.example.test";
test("generated files use the artifact route with readable filename, including key-only metadata", () => {
  const result = artifactDownload({ storage_key: key, title: "Study slides.pptx" }, base);
  const url = new URL(result.url);
  assert.equal(url.pathname, "/api/v1/library/artifacts/download");
  assert.equal(url.searchParams.get("key"), key);
  assert.equal(result.filename, "Study slides.pptx");
});
test("historical API links are corrected to the artifact route", () => {
  for (const path of ["artifacts", "documents"]) {
    const result = artifactDownload(
      {
        download_url: `/api/v1/library/${path}/download?key=${encodeURIComponent(key)}`,
        title: "Study",
      },
      base
    );
    assert.equal(new URL(result.url).pathname, "/api/v1/library/artifacts/download");
  }
});
test("untrusted URLs and traversal cannot receive authenticated downloads", () => {
  for (const artifact of [
    { download_url: `https://evil.example/api/v1/library/artifacts/download?key=${key}` },
    { download_url: `//evil.example/api/v1/library/artifacts/download?key=${key}` },
    { storage_key: key.replace("synthetic", "../synthetic") },
    { storage_key: "universities/synthetic/document.pptx" },
    {},
  ])
    assert.throws(() => artifactDownload(artifact, base));
});
test("download failures explain missing files, expired authentication and retry", () => {
  assert.match(artifactDownloadError(404), /generate it again/);
  assert.match(artifactDownloadError(401), /sign in again/);
  assert.match(artifactDownloadError(503), /retry/);
});
