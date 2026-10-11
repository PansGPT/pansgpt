import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Source = {
  name: string;
  width: number;
  height: number;
  text: [string, number, number, number, number, number, unknown, unknown][];
};
const geometry = JSON.parse(
  readFileSync(resolve(__dirname, "../design/verification-code-geometry.json"), "utf8")
) as { variants: Source[] }[];
test.beforeEach(async ({ page }) => {
  await page.goto("/?section=codes");
  await expect(page.getByRole("heading", { name: "Verification code inputs" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});
test("all six code compositions and twelve digit states retain source geometry and optional labels collapse", async ({
  page,
}) => {
  await expect(page.locator(".code-source-fixture")).toHaveCount(6);
  await expect(page.locator(".code-slot-fixture")).toHaveCount(12);
  await page.evaluate((geometry) => {
    const near = (a: number, b: number, label: string): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${label}: ${a} instead of ${b}`);
    };
    for (const source of geometry[0].variants) {
      const size = /Size=(\w+)/.exec(source.name)?.[1];
      const digits = /Digits=(\d)/.exec(source.name)?.[1];
      const node = document.querySelector<HTMLElement>(
        `.code-source-fixture[data-size="${size}"][data-digits="${digits}"]`
      );
      if (!node) throw new Error("Missing source");
      const box = node.getBoundingClientRect();
      near(box.width, source.width, "width");
      near(box.height, source.height, "height");
      const texts = [
        node.querySelector<HTMLElement>(".p-field-label"),
        ...Array.from(node.querySelectorAll<HTMLElement>(".p-code-digit,.p-code-separator")),
        node.querySelector<HTMLElement>(".p-field-message"),
      ];
      source.text.forEach((text, i) => {
        const target = texts[i];
        if (!target) throw new Error("Missing text");
        const rect = target.getBoundingClientRect();
        near(rect.y - box.y, text[2], source.name + " text y");
        near(rect.height, text[4], "text height");
        if (text[0] === "0") {
          near(rect.x - box.x, text[1], "digit x");
          near(rect.width, text[3], "digit width");
        }
      });
    }
    for (const source of geometry[1].variants) {
      const size = /Size=(\w+)/.exec(source.name)?.[1];
      const state = /State=(\w+)/.exec(source.name)?.[1].toLowerCase();
      const node = document.querySelector<HTMLElement>(
        `.code-slot-fixture[data-size="${size}"][data-state="${state}"] .p-code-slot`
      );
      if (!node) throw new Error("Missing digit state");
      const box = node.getBoundingClientRect();
      near(box.width, source.width, "slot width");
      near(box.height, source.height, "slot height");
      const text = node.querySelector<HTMLElement>(".p-code-digit");
      if (!text) throw new Error("Missing digit");
      const rect = text.getBoundingClientRect();
      near(rect.y - box.y, source.text[0][2], "slot text y");
      near(rect.width, source.text[0][3], "slot text width");
    }
  }, geometry);
  for (const [index, height] of [
    [0, 116],
    [1, 90],
    [2, 90],
    [3, 64],
  ])
    expect((await page.locator(".code-option-fixture").nth(index).boundingBox())?.height).toBe(
      height
    );
  await page
    .locator(".code-source-grid")
    .screenshot({ path: "test-results/verification-code-source.png" });
  await page
    .locator(".code-slot-grid")
    .screenshot({ path: "test-results/verification-code-states.png" });
});
test("native code entry supports typing, paste, selection, deletion, autofill, validation and caller state", async ({
  page,
}) => {
  const form = page.getByRole("form", { name: "Verification example" });
  const input = form.getByRole("textbox", { name: "Study access code" });
  await expect(input).toHaveAttribute("autocomplete", "one-time-code");
  await expect(input).toHaveAttribute("inputmode", "numeric");
  expect(await input.evaluate((n) => (n as HTMLInputElement).checkValidity())).toBe(false);
  await input.focus();
  await page.keyboard.type("12x3");
  await expect(input).toHaveValue("123");
  await expect(form.locator("output")).toHaveText("Code: 123; completed: none");
  await input.evaluate((n) => {
    const data = new DataTransfer();
    data.setData("text/plain", "654-321");
    n.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
    );
  });
  await expect(input).toHaveValue("654321");
  await expect(form.locator("output")).toHaveText("Code: 654321; completed: 654321");
  expect(await form.evaluate((n) => new FormData(n as HTMLFormElement).get("code"))).toBe("654321");
  expect(await input.evaluate((n) => (n as HTMLInputElement).checkValidity())).toBe(true);
  await page.keyboard.press("End");
  await page.keyboard.press("Backspace");
  await expect(input).toHaveValue("65432");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Delete");
  await expect(input).toHaveValue("6432");
  await input.fill("987654");
  await expect(form.locator("output")).toHaveText("Code: 987654; completed: 987654");
  await form.getByRole("button", { name: "Toggle code error" }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription("The code has expired.");
  await form.getByRole("button", { name: "Clear code" }).click();
  await expect(input).toHaveValue("");
  await expect(form.getByRole("textbox", { name: "Disabled code" })).toBeDisabled();
  await expect(form.getByRole("textbox", { name: "Read-only code" })).toHaveAttribute(
    "readonly",
    ""
  );
  const secondary = form.getByRole("textbox", { name: "Uncontrolled code" });
  await secondary.fill("1234");
  await expect(secondary).toHaveValue("1234");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(input).toBeVisible();
});
