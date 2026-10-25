/** Owner-authorized read-only preview of the saved PowerPoint, measured in points. */
export interface PresentationShape {
  kind: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string | null;
  stroke: string | null;
  stroke_width: number;
  radius: number;
}
export interface PresentationText {
  kind: "text";
  x: number;
  y: number;
  text: string;
  font_size: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "start" | "middle" | "end";
}
export interface PresentationSlide {
  number: number;
  title: string;
  notes: string;
  background: string;
  elements: (PresentationShape | PresentationText)[];
}
export interface PresentationPreviewResponse {
  title: string;
  width: number;
  height: number;
  slides_count: number;
  slides: PresentationSlide[];
  warnings: string[];
}
export interface PresentationSource {
  title: string;
  url?: string | null;
}
