import { z } from "zod";
import type {
  FlashcardContent,
  MnemonicContent,
  ChemicalContent,
  ChartContent,
  DiagramContent,
} from "@pansgpt/types";

const text = z.string().trim().min(1).max(12000);
export const flashcardContentSchema: z.ZodType<FlashcardContent> = z
  .object({
    topic: text,
    cards: z
      .array(
        z.object({
          front: text,
          back: text,
          hint: text.optional(),
          difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        })
      )
      .min(1)
      .max(100),
    total: z.number().int().min(1).max(100),
  })
  .refine((value) => value.total === value.cards.length);
export const mnemonicContentSchema: z.ZodType<MnemonicContent> = z.object({
  concept: text,
  mnemonic: text,
  breakdown: z.array(text).min(1).max(100),
  clinical_notes: text.nullish(),
});
export const chemicalContentSchema: z.ZodType<ChemicalContent> = z.object({
  compound_name: text,
  smiles: z.string().min(1).max(2000),
  formula: text.nullish(),
  notes: text.nullish(),
});
const number = z.number().min(-1e12).max(1e12);
export const chartContentSchema: z.ZodType<ChartContent> = z
  .object({
    type: z.enum(["line", "bar", "scatter"]),
    title: text,
    data: z.object({
      labels: z.array(z.string().max(160)).max(200).optional(),
      datasets: z
        .array(
          z.object({
            label: z.string().max(160),
            data: z
              .array(z.union([number, z.object({ x: number, y: number })]))
              .min(1)
              .max(200),
          })
        )
        .min(1)
        .max(8),
      x_label: z.string().max(160).optional(),
      y_label: z.string().max(160).optional(),
    }),
  })
  .refine((value) =>
    value.data.datasets.every((set) =>
      set.data.every((point) => typeof point === "number")
        ? value.type !== "scatter" && value.data.labels?.length === set.data.length
        : set.data.every((point) => typeof point !== "number") && value.type !== "bar"
    )
  );
export const diagramContentSchema: z.ZodType<DiagramContent> = z.object({
  type: z.literal("mermaid"),
  title: text,
  data: z.object({ code: text }),
});

/** Model-supplied directives, interactions and URLs never configure the renderer. */
export function safeDiagramSource(code: string): boolean {
  return (
    code.length <= 12000 &&
    /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|mindmap|timeline|pie|gantt|journey|quadrantChart)\b/.test(
      code.trim()
    ) &&
    !/%%\s*\{|\bclick\b|\bhref\b|(?:https?:|data:|javascript:|file:|url\s*\()|<|>|@\{|\bstyle\b|\bclassDef\b/i.test(
      code
        .replace(/-->/g, "")
        .replace(/==>/g, "")
        .replace(/->>/g, "")
        .replace(/-->>/g, "")
        .replace(/-\.->/g, "")
    )
  );
}
