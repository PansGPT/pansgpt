import { figmaIconUrl, type FigmaIconName } from "./figma-icons";

/** Original Figma master SVG. Its intrinsic dimensions and colors are preserved. */
export function FigmaIcon({
  name,
  label,
}: {
  name: FigmaIconName;
  label?: string;
}): React.ReactElement {
  return <img src={figmaIconUrl(name)} alt={label ?? ""} aria-hidden={label ? undefined : true} />;
}
