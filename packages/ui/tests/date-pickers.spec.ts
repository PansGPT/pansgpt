import { expect, test } from "@playwright/test";
import { dateSources } from "../preview/date-source-data";
import {
  addDateDays,
  dateMonthDays,
  formatDateOnly,
  normalizeDateRange,
  parseDateOnly,
  selectRangeDate,
  shiftDateMonth,
} from "../src/components/date-utils";
test("date-only arithmetic rejects impossible dates, clamps months, and orders ranges", () => {
  expect(parseDateOnly("2025-02-29")).toBeUndefined();
  expect(parseDateOnly("2024-02-29")).toBeDefined();
  expect(parseDateOnly("2025-13-01")).toBeUndefined();
  expect(shiftDateMonth("2024-01-31", 1)).toBe("2024-02-29");
  expect(shiftDateMonth("2025-01-31", 1)).toBe("2025-02-28");
  expect(addDateDays("2025-12-31", 1)).toBe("2026-01-01");
  expect(addDateDays("2025-03-09", 1)).toBe("2025-03-10");
  expect(dateMonthDays("0001-01-01", 0)).toHaveLength(42);
  expect(dateMonthDays("9999-12-01")).toHaveLength(42);
  expect(dateMonthDays("0001-01-01", 0).filter((day) => parseDateOnly(day))).toContain(
    "0001-01-01"
  );
  expect(dateMonthDays("2025-01-01")).toHaveLength(42);
  expect(dateMonthDays("2025-01-01")[0]).toBe("2024-12-30");
  expect(formatDateOnly("2025-01-10")).toBe("Jan 10, 2025");
  expect(normalizeDateRange({ start: "2025-01-16", end: "2025-01-10" })).toEqual({
    start: "2025-01-10",
    end: "2025-01-16",
  });
  expect(selectRangeDate({ start: "2025-01-16", end: null }, "2025-01-10")).toEqual({
    start: "2025-01-10",
    end: "2025-01-16",
  });
});
test("all 42 date-picker specimens preserve native frames and original SVG sizes", async ({
  page,
}) => {
  await page.goto("/?section=datepickers");
  await page.evaluate(() => document.fonts.ready);
  const failures: string[] = [];
  for (const family of dateSources.filter((family) =>
    ["1150:62", "1150:1925", "1150:16803", "1547:269867", "7365:57922"].includes(family.id)
  ))
    for (const source of family.variants) {
      const box = await page
        .locator(`[data-date-source-id="${source.id}"] > *`)
        .first()
        .boundingBox();
      if (
        !box ||
        Math.abs(box.width - source.width) > 1.1 ||
        Math.abs(box.height - source.height) > 0.15
      )
        failures.push(
          `${source.id}: ${box?.width}x${box?.height}; expected ${source.width}x${source.height}`
        );
    }
  expect(failures).toEqual([]);
  for (const source of dateSources.find((family) => family.id === "1150:16803")!.variants) {
    const box = await page
      .locator(`[data-date-source-id="${source.id}"] .p-date-picker-trigger`)
      .boundingBox();
    expect(Math.abs((box?.width ?? 0) - source.width), source.id).toBeLessThan(1.1);
  }
  const resized = await page.evaluate(async () =>
    (
      await Promise.all(
        [...document.querySelectorAll<HTMLImageElement>('.date-source-grid img[src$=".svg"]')].map(
          async (image) => {
            const root = new DOMParser().parseFromString(
              await (await fetch(image.src)).text(),
              "image/svg+xml"
            ).documentElement;
            const style = getComputedStyle(image);
            return Math.abs(
              Number.parseFloat(style.width) - Number.parseFloat(root.getAttribute("width") ?? "0")
            ) > 0.1 ||
              Math.abs(
                Number.parseFloat(style.height) -
                  Number.parseFloat(root.getAttribute("height") ?? "0")
              ) > 0.1
              ? image.src
              : undefined;
          }
        )
      )
    ).filter(Boolean)
  );
  expect(resized).toEqual([]);
});
test("range drafts commit on Apply, discard on Cancel and restore popover focus", async ({
  page,
}) => {
  await page.goto("/?section=datepickers");
  const trigger = page
    .getByTestId("live-date-range")
    .getByRole("button", { name: "Choose study dates" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Choose study dates" });
  await dialog.getByRole("gridcell", { name: "Monday, January 20, 2025", exact: true }).click();
  await dialog.getByRole("gridcell", { name: "Saturday, January 18, 2025", exact: true }).click();
  await expect(page.getByTestId("date-value")).toHaveText(
    '{"start":"2025-01-10","end":"2025-01-16"}'
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel("Start date")).toHaveValue("Jan 10, 2025");
  await dialog.getByRole("gridcell", { name: "Monday, January 20, 2025", exact: true }).click();
  await dialog.getByRole("gridcell", { name: "Saturday, January 18, 2025", exact: true }).click();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByTestId("date-value")).toHaveText(
    '{"start":"2025-01-18","end":"2025-01-20"}'
  );
  await expect(trigger).toBeFocused();
});
test("keyboard dates skip unavailable days, validate input and cross month boundaries", async ({
  page,
}) => {
  await page.goto("/?section=datepickers");
  const calendar = page.getByTestId("live-bounded-calendar");
  const day = calendar.getByRole("gridcell", { name: "Friday, January 10, 2025", exact: true });
  await day.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    calendar.getByRole("gridcell", { name: "Sunday, January 12, 2025", exact: true })
  ).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(
    calendar.getByRole("gridcell", { name: "Wednesday, February 12, 2025", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(calendar.getByLabel("Selected date")).toHaveValue("Feb 12, 2025");
  await calendar.getByLabel("Selected date").fill("2025-02-30");
  await calendar.getByLabel("Selected date").press("Enter");
  await expect(calendar.getByLabel("Selected date")).toHaveAttribute("aria-invalid", "true");
  await expect(calendar.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
  await calendar.getByLabel("Selected date").fill("2025-02-18");
  await calendar.getByLabel("Selected date").press("Enter");
  await expect(calendar.getByLabel("Selected date")).toHaveAttribute("aria-invalid", "false");
  await calendar.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByTestId("date-action")).toHaveText('{"start":"2025-02-18","end":null}');
});
test("date modal restores focus and stays within a 375px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?section=datepickers");
  const trigger = page.getByRole("button", { name: "Open date modal", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Choose review date" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("gridcell", { name: "Friday, January 10, 2025", exact: true }).click();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
import { defaultDatePresets } from "../src/components/date-utils";

test("date presets stay valid at the first and last supported years", () => {
  for (const today of ["0001-01-01", "0001-01-03", "9999-12-31"]) {
    const presets = defaultDatePresets(today);
    expect(presets.find((preset) => preset.id === "today")?.range).toEqual({
      start: today,
      end: today,
    });
    for (const preset of presets) {
      expect(parseDateOnly(preset.range.start ?? "")).toBeDefined();
      expect(parseDateOnly(preset.range.end ?? "")).toBeDefined();
      expect(preset.range.start! <= preset.range.end!).toBe(true);
    }
  }
});
