import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const section = JSON.parse(await readFile(new URL("design/section-assets.json", root), "utf8"));
const editor = JSON.parse(await readFile(new URL("design/text-editor-assets.json", root), "utf8"));
const command = JSON.parse(await readFile(new URL("design/command-assets.json", root), "utf8"));
const inlineCTA = JSON.parse(await readFile(new URL("design/inline-cta-assets.json", root), "utf8"));
const metric = JSON.parse(await readFile(new URL("design/metric-assets.json", root), "utf8"));
const video = JSON.parse(await readFile(new URL("design/video-assets.json", root), "utf8"));
const feed = JSON.parse(await readFile(new URL("design/feed-assets.json", root), "utf8"));
const message = JSON.parse(await readFile(new URL("design/message-assets.json", root), "utf8"));
const slideout = JSON.parse(await readFile(new URL("design/slideout-assets.json", root), "utf8"));
const chart = JSON.parse(await readFile(new URL("design/chart-assets.json", root), "utf8"));
const table = JSON.parse(await readFile(new URL("design/table-assets.json", root), "utf8"));
const applicationNavigation = JSON.parse(await readFile(new URL("design/application-navigation-assets.json", root), "utf8"));
const date = JSON.parse(await readFile(new URL("design/date-assets.json", root), "utf8"));
const foundation = JSON.parse(await readFile(new URL("design/foundation-assets.json", root), "utf8"));
const badgeFinal = JSON.parse(await readFile(new URL("design/badge-final-assets.json", root), "utf8"));
const buttonNative = JSON.parse(await readFile(new URL("design/button-native-assets.json", root), "utf8"));
const fieldNative = JSON.parse(await readFile(new URL("design/field-native-assets.json", root), "utf8"));
const controlNative = JSON.parse(await readFile(new URL("design/control-native-assets.json", root), "utf8"));
const manifest = { assets: [...section.assets, ...editor.assets, ...command.assets, ...inlineCTA.assets, ...metric.assets, ...video.assets, ...feed.assets, ...message.assets, ...slideout.assets, ...chart.assets, ...table.assets, ...applicationNavigation.assets, ...date.assets, ...foundation.assets, ...badgeFinal.assets, ...buttonNative.assets, ...fieldNative.assets, ...controlNative.assets] };
for (const asset of manifest.assets) {
  const bytes = await readFile(new URL(`assets/${asset.file}`, root));
  assert.ok(bytes.length > 0, `${asset.file} must not be empty`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, `${asset.file} source checksum`);
  if (asset.file.endsWith(".svg")) {
    const svgRoot = bytes.toString("utf8").match(/<svg\b[^>]*>/)?.[0];
    assert.ok(svgRoot, `${asset.file} SVG root`);
    assert.equal(Number(svgRoot.match(/\bwidth="([^"]+)"/)?.[1]), asset.width, `${asset.file} intrinsic width`);
    assert.equal(Number(svgRoot.match(/\bheight="([^"]+)"/)?.[1]), asset.height, `${asset.file} intrinsic height`);
  }
}
console.log(`Verified ${manifest.assets.length} original component assets and intrinsic SVG dimensions.`);
