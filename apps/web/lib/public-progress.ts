import type { ChatProgressCode, PublicProgressUpdate } from "@pansgpt/types";

const codes: ReadonlySet<string> = new Set<ChatProgressCode>([
  "reviewing_request",
  "checking_materials",
  "searching_sources",
  "reading_document",
  "analysing_image",
  "creating_materials",
  "using_tool",
  "writing_response",
  "planning_presentation",
  "creating_presentation",
  "presentation_ready",
]);

export function parsePublicProgress(value: unknown): PublicProgressUpdate | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  if (
    item.source !== "model" ||
    typeof item.code !== "string" ||
    !codes.has(item.code) ||
    typeof item.label !== "string" ||
    /[\x00-\x1f\x7f<>`{}]|https?:\/\/|www\./i.test(item.label)
  )
    return undefined;
  const label = item.label.trim().replace(/\s+/g, " ");
  if (
    label.length < 3 ||
    label.length > 120 ||
    label.split(" ").length > 16 ||
    label.split(" ").some((word) => word.length > 40)
  )
    return undefined;
  return { code: item.code as ChatProgressCode, label, source: "model" };
}

export function parsePublicProgressUpdates(value: unknown): PublicProgressUpdate[] {
  if (!Array.isArray(value)) return [];
  const result: PublicProgressUpdate[] = [];
  for (const entry of value.slice(0, 24)) {
    const item = parsePublicProgress(entry);
    if (
      item &&
      !result.some((previous) => previous.code === item.code && previous.label === item.label)
    )
      result.push(item);
  }
  return result;
}
