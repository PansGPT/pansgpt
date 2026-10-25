import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
type Source = {
  name: string;
  width: number;
  height: number;
  layers: [string, number, number, number, number][];
};
const sources = JSON.parse(
  readFileSync(resolve(__dirname, "../design/avatar-profile-geometry.json"), "utf8")
) as Source[];
test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=avatars");
  await expect(page.getByRole("heading", { name: "Avatar groups and labels" })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
});
test("all nine profile-photo variants preserve original frame, content, glyph and badge geometry", async ({
  page,
}) => {
  await expect(page.locator(".avatar-profile-fixture")).toHaveCount(9);
  await page.evaluate(async (sources) => {
    const near = (a: number, b: number, name: string): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${name}: ${a} instead of ${b}`);
    };
    for (const source of sources) {
      const size = /Size=(\w+)/.exec(source.name)?.[1];
      const mode = source.name.includes("Text=True")
        ? "initials"
        : source.name.includes("Placeholder=True")
          ? "placeholder"
          : "photo";
      const node = document.querySelector<HTMLElement>(
        `.avatar-profile-fixture[data-size="${size}"][data-mode="${mode}"] .p-avatar-profile`
      );
      if (!node) throw new Error("Missing variant");
      const box = node.getBoundingClientRect();
      near(box.width, source.width, "width");
      near(box.height, source.height, "height");
      for (const [name, x, y, width, height] of source.layers) {
        const cls =
          name === "Wrapper"
            ? ".p-avatar-profile-wrapper"
            : name === "Content"
              ? ".p-avatar-profile-content"
              : name === "Verified tick"
                ? ".p-avatar-profile-verified"
                : name === "user-01"
                  ? ".p-avatar-profile-glyph"
                  : ".p-avatar-initials";
        const target = node.querySelector<HTMLElement>(cls);
        if (!target) throw new Error("Missing " + name);
        const b = target.getBoundingClientRect();
        near(b.x - box.x, x, source.name + " " + name + " x");
        near(b.y - box.y, y, "y");
        near(b.width, width, "width");
        near(b.height, height, "height");
      }
      for (const image of node.querySelectorAll<HTMLImageElement>("img")) {
        await image.decode();
        if (!image.src.startsWith(location.origin)) throw new Error("Remote asset");
        if (image.src.endsWith(".svg")) {
          const b = image.getBoundingClientRect();
          near(b.width, image.naturalWidth, "SVG width");
          near(b.height, image.naturalHeight, "SVG height");
        }
      }
    }
  }, sources);
  await page
    .locator(".avatar-profile-source-grid")
    .screenshot({ path: "test-results/avatar-profiles-source.png" });
});
test("profile images recover from failure and verification stays caller-owned across themes", async ({
  page,
}) => {
  await page.route("**/missing-profile.png", (route) => route.fulfill({ status: 404, body: "" }));
  const demo = page.getByRole("group", { name: "Interactive profile photo" });
  const root = demo.locator(".p-avatar-profile");
  await expect(root).toHaveAttribute("data-mode", "photo");
  await expect(demo.getByRole("img", { name: "Student profile, verified" })).toBeVisible();
  await demo.getByRole("button", { name: "Use unavailable profile image" }).click();
  await expect(root).toHaveAttribute("data-mode", "placeholder");
  await expect(root.locator(".p-avatar-profile-glyph")).toBeVisible();
  expect((await root.locator(".p-avatar-profile-content").boundingBox())?.width).toBe(86);
  await demo.getByRole("button", { name: "Restore profile image" }).click();
  await expect(root).toHaveAttribute("data-mode", "photo");
  expect((await root.locator(".p-avatar-profile-content").boundingBox())?.width).toBe(88);
  await demo.getByRole("button", { name: "Toggle profile verification" }).click();
  await expect(root.locator(".p-avatar-profile-verified")).toHaveCount(0);
  await expect(demo.getByRole("img", { name: "Student profile", exact: true })).toBeVisible();
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(root).toHaveAttribute("data-mode", "photo");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
