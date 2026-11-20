/** Public content carried by the existing artifact_ready SSE/history envelope. */
export interface StudyFlashcard {
  front: string;
  back: string;
  hint?: string;
  difficulty?: "easy" | "medium" | "hard";
}
export interface FlashcardContent {
  topic: string;
  cards: StudyFlashcard[];
  total: number;
}
export interface MnemonicContent {
  concept: string;
  mnemonic: string;
  breakdown: string[];
  clinical_notes?: string | null;
}
export interface ChemicalContent {
  compound_name: string;
  smiles: string;
  formula?: string | null;
  notes?: string | null;
}
export interface ChartPoint {
  x: number;
  y: number;
}
export interface ChartDataset {
  label: string;
  data: Array<number | ChartPoint>;
}
export interface ChartContent {
  type: "line" | "bar" | "scatter";
  title: string;
  data: { labels?: string[]; datasets: ChartDataset[]; x_label?: string; y_label?: string };
}
export interface DiagramContent {
  type: "mermaid";
  title: string;
  data: { code: string };
}
