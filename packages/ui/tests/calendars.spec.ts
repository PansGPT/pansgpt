import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { dateSources } from "../preview/date-source-data";
import { layoutCalendarEvents, type CalendarEvent } from "../src/components/calendar-layout";
test("overlap lanes separate connected groups and permit touching endpoints", () => {
  const make = (id: string, startMinutes: number, endMinutes: number): CalendarEvent => ({
    id,
    date: "2025-01-10",
    title: id,
    startMinutes,
    endMinutes,
  });
  const events = [
    make("c", 620, 650),
    make("a", 540, 600),
    make("b", 570, 630),
    make("d", 650, 700),
  ];
  const result = layoutCalendarEvents(events);
  expect(result.map((item) => [item.event.id, item.lane, item.lanes])).toEqual([
    ["a", 0, 2],
    ["b", 1, 2],
    ["c", 0, 2],
    ["d", 0, 1],
  ]);
  expect(events.map((event) => event.id)).toEqual(["c", "a", "b", "d"]);
});
test("all 84 calendar specimens retain native root frames and SVG dimensions", async ({ page }) => {
  await openPreview(page, "/?section=calendars");
  await page.evaluate(() => document.fonts.ready);
  const families = dateSources.filter(
    (f) => !["1150:62", "1150:1925", "1150:16803", "1547:269867", "7365:57922"].includes(f.id)
  );
  expect(families.flatMap((f) => f.variants)).toHaveLength(84);
  for (const source of families.flatMap((f) => f.variants)) {
    const root = page.locator(`[data-calendar-source-id="${source.id}"] > :first-child`);
    const bounds = await root.boundingBox();
    expect(bounds, source.id).not.toBeNull();
    expect(Math.abs((bounds?.width ?? 0) - source.width), source.id + " width").toBeLessThanOrEqual(
      1.1
    );
    expect(
      Math.abs((bounds?.height ?? 0) - source.height),
      source.id + " height"
    ).toBeLessThanOrEqual(1.1);
  }
  const resized = await page
    .locator('[data-calendar-source-id] img[src$=".svg"]')
    .evaluateAll((images) =>
      images.flatMap((element) => {
        const image = element as HTMLImageElement;
        const rect = image.getBoundingClientRect();
        return image.naturalWidth &&
          (Math.abs(rect.width - image.naturalWidth) > 0.2 ||
            Math.abs(rect.height - image.naturalHeight) > 0.2)
          ? [
              {
                src: image.src,
                width: rect.width,
                height: rect.height,
                native: [image.naturalWidth, image.naturalHeight],
              },
            ]
          : [];
      })
    );
  expect(resized).toEqual([]);
});
test("calendar view selector, navigation, event and add callbacks work with keyboard", async ({
  page,
}) => {
  await openPreview(page, "/?section=calendars");
  const live = page.getByTestId("live-calendar");
  const trigger = live.getByRole("button", { name: "Calendar view", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitemradio", { name: "Day view", exact: true }).click();
  await expect(page.getByTestId("calendar-state")).toHaveText("2025-01-10 day");
  await expect(trigger).toBeFocused();
  await live.getByRole("button", { name: "Next period", exact: true }).click();
  await expect(page.getByTestId("calendar-state")).toHaveText("2025-01-11 day");
  await live.getByRole("button", { name: "Today", exact: true }).click();
  await live.getByRole("button", { name: /^Product demo,/ }).click();
  await expect(page.getByTestId("calendar-action")).toHaveText("8017:532935-11");
  await live.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(page.getByTestId("calendar-action")).toHaveText("Add 2025-01-10 ");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("mobile calendar specimens stay within 375px and expose event details", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await openPreview(page, "/?section=calendars");
  for (const id of ["8017:532765", "8017:532961", "8017:532978"]) {
    const root = page.locator(`[data-calendar-source-id="${id}"] .p-calendar`);
    expect(
      await root.evaluate((element) => element.scrollWidth - element.clientWidth)
    ).toBeLessThanOrEqual(1);
  }
  await expect(
    page.locator('[data-calendar-source-id="8017:532765"] .p-calendar-selected-day')
  ).toContainText("Friday");
});
test("calendar year boundaries disable navigation beyond supported dates", async ({ page }) => {
  await openPreview(page, "/?section=calendars");
  await expect(
    page.getByTestId("first-year-calendar").getByRole("button", { name: "Previous period" })
  ).toBeDisabled();
  await expect(
    page.getByTestId("last-year-calendar").getByRole("button", { name: "Next period" })
  ).toBeDisabled();
  await expect(
    page.getByTestId("first-year-calendar").locator('[data-date="0000-12-31"] > button')
  ).toBeDisabled();
});
