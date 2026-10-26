import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
type Layer = [string, number, number, number, number];
type Source = [string, string, number, number, Layer[]];
const families = JSON.parse(
  readFileSync(resolve(__dirname, "../design/step-composition-geometry.json"), "utf8")
) as { id: string; variants: Source[] }[];
const layers = JSON.parse(
  readFileSync(resolve(__dirname, "../design/step-composition-layers.json"), "utf8")
) as { id: string; variants: [string, Layer[]][] }[];
test("live centered connectors update original stroke artwork and support three steps", async ({
  page,
}) => {
  await openPreview(page, "/?section=steps");
  const flow = page.getByRole("navigation", { name: "Centered live progress", exact: true });
  const desktop = flow.locator('[data-layout="desktop"]');
  const strokes = desktop.locator(".p-steps-live-line img");
  await expect(strokes).toHaveCount(3);
  await expect(strokes.nth(0)).toHaveAttribute("src", /check-complete(?:-[A-Za-z0-9_-]+)?\.png$/);
  await expect(strokes.nth(1)).toHaveAttribute("src", /check-incomplete(?:-[A-Za-z0-9_-]+)?\.png$/);
  await flow.getByRole("button", { name: "Add your socials", exact: true }).click();
  for (const image of await strokes.all()) {
    await expect(image).toHaveAttribute("src", /check-complete(?:-[A-Za-z0-9_-]+)?\.png$/);
    await image.evaluate(async (node) => {
      const image = node as HTMLImageElement;
      await image.decode();
      if (
        image.naturalWidth !== 258 ||
        image.naturalHeight !== 2 ||
        image.getBoundingClientRect().height !== 2
      )
        throw new Error("Wrong original bitmap stroke");
      const canvas = document.createElement("canvas");
      canvas.width = 258;
      canvas.height = 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Missing canvas");
      context.drawImage(image, 0, 0);
      const pixel = context.getImageData(128, 1, 1, 1).data;
      if (pixel[3] < 100 || pixel[1] <= pixel[0])
        throw new Error("Completed connector lost its green artwork");
    });
  }
  const three = page.getByRole("navigation", { name: "Three-step centered progress", exact: true });
  const threeDesktop = three.locator('[data-layout="desktop"]');
  await expect(threeDesktop.locator(".p-steps-live-line")).toHaveCount(2);
  await threeDesktop.evaluate((root) => {
    const items = root.querySelectorAll<HTMLElement>(".p-steps-item");
    for (let index = 0; index < items.length - 1; index++) {
      const line = items[index].querySelector(".p-steps-live-line")?.getBoundingClientRect();
      const current = items[index].getBoundingClientRect();
      const next = items[index + 1].getBoundingClientRect();
      if (
        !line ||
        Math.abs(line.x - (current.x + current.width / 2 - 1)) > 0.5 ||
        Math.abs(line.right - (next.x + next.width / 2 + 1)) > 0.5
      )
        throw new Error("Connector misses a step center");
    }
  });
  const connected = page.getByRole("navigation", {
    name: "Three-step connected progress",
    exact: true,
  });
  const width = await connected
    .locator('[data-layout="desktop"] .p-steps-list')
    .evaluate((node) => node.getBoundingClientRect().width);
  expect(Math.abs(width - (72 + 2 * 74.6667))).toBeLessThan(0.5);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(flow.getByRole("button", { name: "Add your socials", exact: true })).toHaveAttribute(
    "aria-current",
    "step"
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("all thirty-eight progress compositions match original layer and artwork geometry", async ({
  page,
}) => {
  await openPreview(page, "/?section=steps");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".step-composition-fixture")).toHaveCount(38);
  await page.evaluate(
    async ({ families, layers }) => {
      const near = (a: number, b: number, message: string): void => {
        if (Math.abs(a - b) > 0.5) throw new Error(`${message}: ${a} instead of ${b}`);
      };
      for (const family of families)
        for (const [id, name, width, height, children] of family.variants) {
          const root = document.querySelector(`[data-source-id="${id}"]`);
          if (!root) throw new Error("Missing composition");
          const box = root.getBoundingClientRect();
          const mobile = root.getAttribute("data-breakpoint") === "mobile";
          const layout = root.querySelector(`[data-layout="${mobile ? "mobile" : "desktop"}"]`);
          if (!layout) throw new Error("Missing active layout");
          near(box.width, width, `${id} ${name} width`);
          near(box.height, height, `${id} ${name} height`);
          const nodes =
            family.id === "1139:79149"
              ? [layout]
              : family.id === "1139:79128" || (family.id === "1141:76669" && !mobile)
                ? [layout.querySelector(".p-steps-list")!]
                : [...layout.querySelectorAll(".p-progress-step")];
          if (nodes.length !== children.length) throw new Error("Incorrect direct layer count");
          for (const [index, node] of nodes.entries()) {
            const [, x, y, w, h] = children[index];
            const b = node.getBoundingClientRect();
            near(b.x - box.x, x, `${id} child ${index} x`);
            near(b.y - box.y, y, `${id} child ${index} y`);
            near(b.width, w, `${id} child ${index} width`);
            near(b.height, h, `${id} child ${index} height`);
          }
          const nested =
            layers
              .find((layer) => layer.id === family.id)
              ?.variants.find((layer) => layer[0] === id)?.[1] ?? [];
          const numbers = [...layout.querySelectorAll(".p-step-number")];
          const titles = [...layout.querySelectorAll(".p-step-title")];
          const supporting = [...layout.querySelectorAll(".p-step-supporting")];
          const lines = [
            ...layout.querySelectorAll(".p-steps-connected-line, .p-steps-centered-line img"),
          ];
          let numberIndex = 0,
            textIndex = 0,
            lineIndex = 0;
          const combinedLine = nested.some((layer) => layer[0] === "Lines");
          for (const [text, x, y, w, h] of nested) {
            // Figma exports the Lines group as one original graphic, including its child strokes.
            if (combinedLine && text === "Line") continue;
            const line = text === "Lines" || text === "Line";
            const number = /^\d+$/.test(text);
            const counter = text.startsWith("Step ");
            const node = line
              ? lines[lineIndex++]
              : number
                ? numbers[numberIndex++]
                : counter
                  ? layout.querySelector(".p-steps-counter")
                  : textIndex % 2 === 0
                    ? titles[Math.floor(textIndex++ / 2)]
                    : supporting[Math.floor(textIndex++ / 2)];
            if (!node) throw new Error(`${id} missing ${text}`);
            const b = node.getBoundingClientRect();
            if (!line && node.textContent !== text)
              throw new Error(`${id} wrong source text: ${node.textContent} instead of ${text}`);
            near(b.x - box.x, x - (line ? 1 : 0), `${id} ${text} x`);
            near(b.y - box.y, y - (line ? 1 : 0), `${id} ${text} y`);
            near(
              b.width,
              w + (line ? 2 : 0),
              `${id} ${text} width (${getComputedStyle(node).width}, ${getComputedStyle(node).height})`
            );
            near(b.height, line ? 2 : h, `${id} ${text} height`);
          }
          for (const image of layout.querySelectorAll<HTMLImageElement>("img")) {
            await image.decode();
            if (!image.src.startsWith(location.origin)) throw new Error("Remote graphic");
            const b = image.getBoundingClientRect();
            if (image.src.endsWith(".png")) {
              near(b.width, image.naturalWidth, "PNG width");
              near(b.height, image.naturalHeight, "PNG height");
            } else {
              const svg = new DOMParser().parseFromString(
                await (await fetch(image.src)).text(),
                "image/svg+xml"
              ).documentElement;
              const rotated = Boolean(image.closest(".p-step-connector-slot"));
              const width = Number(svg.getAttribute("width"));
              const height = Number(svg.getAttribute("height"));
              near(b.width, rotated ? height : width, "Native SVG width");
              near(b.height, rotated ? width : height, "Native SVG height");
            }
          }
        }
    },
    { families, layers }
  );
  await page
    .locator(".step-composition-source-grid")
    .screenshot({ path: "test-results/step-compositions-source.png" });
  await page.setViewportSize({ width: 1800, height: 1100 });
  await page.addStyleTag({ content: ".step-composition-source-scroll { overflow:visible; }" });
  for (const family of families)
    for (const [id] of family.variants) {
      await page
        .locator(`[data-source-id="${id}"]`)
        .screenshot({ path: `test-results/step-composition-${id.replace(":", "-")}.png` });
    }
});

test("progress step actions preserve controlled and uncontrolled selection on mobile", async ({
  page,
}) => {
  await openPreview(page, "/?section=steps");
  const demo = page.getByRole("group", { name: "Interactive progress steps" });
  const flow = demo.getByRole("navigation", { name: "Setup flow", exact: true });
  const first = flow.getByRole("button", { name: "Your details", exact: true });
  await first.scrollIntoViewIfNeeded();
  await first.focus();
  await first.press("Enter");
  await expect(first).toHaveAttribute("aria-current", "step");
  await expect(demo.locator("output")).toHaveText("Selected step: 0; changes: 1");
  await expect(flow.getByRole("button", { name: "Invite your team", exact: true })).toBeDisabled();
  await first.press("Tab");
  await page.keyboard.press("Space");
  await expect(demo.locator("output")).toHaveText("Selected step: 1; changes: 2");
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(demo.locator("output")).toHaveText("Selected step: 1; changes: 2");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await flow.getByRole("button", { name: "Add your socials", exact: true }).click();
  await expect(demo.locator("output")).toHaveText("Selected step: 3; changes: 3");
  const uncontrolled = demo.getByRole("navigation", {
    name: "Uncontrolled setup flow",
    exact: true,
  });
  await uncontrolled.getByRole("button", { name: "Company details", exact: true }).click();
  await expect(uncontrolled.locator('[data-layout="mobile"] .p-steps-counter')).toHaveText(
    "Step 2 of 4"
  );
  await expect(
    demo
      .getByRole("navigation", { name: "Hidden-counter progress", exact: true })
      .locator(".p-steps-counter")
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await expect(flow.getByRole("button", { name: "Add your socials", exact: true })).toHaveAttribute(
    "aria-current",
    "step"
  );
});
