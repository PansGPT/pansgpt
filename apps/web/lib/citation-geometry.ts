import type { BoundingBoxCoordinates } from "@pansgpt/types";

function rectangle(value: unknown): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(
      (point: unknown) =>
        typeof point === "number" && Number.isFinite(point) && point >= 0 && point <= 1
    ) &&
    value[2] > value[0] &&
    value[3] > value[1]
  );
}

/** Invalid or legacy geometry falls back to a page citation, never an invented text match. */
export function parseCitationGeometry(value: unknown): BoundingBoxCoordinates | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("page" in value) ||
    !("bbox" in value) ||
    typeof value.page !== "number" ||
    !Number.isInteger(value.page) ||
    value.page < 1 ||
    !rectangle(value.bbox)
  )
    return null;
  const rects =
    "rects" in value && Array.isArray(value.rects)
      ? value.rects.filter(rectangle).slice(0, 100)
      : undefined;
  return { page: value.page, bbox: value.bbox, ...(rects?.length ? { rects } : {}) };
}
