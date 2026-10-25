import { z } from "zod";
import type { ArtifactItem, PresentationPreviewResponse } from "@pansgpt/types";
import { artifactDownload } from "./artifact-download";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const coordinate = z.number().finite().min(-2000).max(4000);
const shape = z.object({
  kind: z.enum(["rect", "ellipse"]),
  x: coordinate,
  y: coordinate,
  width: z.number().min(0).max(4000),
  height: z.number().min(0).max(4000),
  fill: color.nullable(),
  stroke: color.nullable(),
  stroke_width: z.number().min(0).max(20),
  radius: z.number().min(0).max(100),
});
const text = z.object({
  kind: z.literal("text"),
  x: coordinate,
  y: coordinate,
  text: z.string().max(1000),
  font_size: z.number().positive().max(160),
  bold: z.boolean(),
  italic: z.boolean(),
  color,
  align: z.enum(["start", "middle", "end"]),
});
export const presentationPreviewSchema = z
  .object({
    title: z.string().max(500),
    width: z.number().positive().max(2000),
    height: z.number().positive().max(2000),
    slides_count: z.number().int().min(1).max(30),
    warnings: z.array(z.string().max(500)).max(8),
    slides: z
      .array(
        z.object({
          number: z.number().int().min(1).max(30),
          title: z.string().max(500),
          notes: z.string().max(8000),
          background: color,
          elements: z.array(z.union([shape, text])).max(500),
        })
      )
      .min(1)
      .max(30),
  })
  .refine(
    (deck) =>
      deck.slides_count === deck.slides.length &&
      deck.slides.every((slide, index) => slide.number === index + 1),
    "Invalid slide sequence."
  );

export async function loadPresentationPreview(
  artifact: ArtifactItem,
  apiBase: string,
  token: string | undefined,
  signal: AbortSignal
): Promise<PresentationPreviewResponse> {
  if (!token) throw new Error("Please sign in again to preview this presentation.");
  const { url: download, filename } = artifactDownload(artifact, apiBase);
  if (!filename.endsWith(".pptx")) throw new Error("Choose a PowerPoint presentation.");
  const url = new URL(download);
  url.pathname = "/api/v1/library/artifacts/presentation";
  url.searchParams.delete("filename");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Please sign in again to preview this presentation."
        : response.status === 404
          ? "This presentation is no longer available."
          : response.status === 422
            ? "This file cannot be previewed. Download it to view the presentation."
            : "The preview is unavailable. Please retry, or download the file."
    );
  const parsed = presentationPreviewSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error("The presentation preview could not be read. You can still download the file.");
  return parsed.data;
}

export const presentationMetadataSchema = z.object({
  slides_count: z.number().int().min(1).max(30).optional(),
  slide_titles: z.array(z.string()).optional(),
  sources: z
    .array(z.object({ title: z.string(), url: z.string().nullable().optional() }))
    .optional(),
});
