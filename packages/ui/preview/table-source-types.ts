export type SourceCellContent = {
  backgrounds: string[];
  texts: { name: string; text: string; style: string }[];
  images: { src: string; style: string }[];
  blocks: { name: string; style: string; texts: string[] }[];
  controls: { name: string; style: string; value: string }[];
};
export type TableSourceCell = {
  id: string;
  name: string;
  height: number;
  props: Record<string, string | boolean>;
  content: SourceCellContent;
};
export type TableSource = {
  id: string;
  width: number;
  height: number;
  header?: number;
  pagination?: number;
  headerContent: SourceCellContent | null;
  assetIndex: number;
  columns: { id: string; width: number; cells: TableSourceCell[] }[];
};
