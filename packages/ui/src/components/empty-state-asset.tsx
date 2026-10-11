import asset0 from "../../assets/empty-featured-sm-imgContent.svg";
import asset1 from "../../assets/empty-featured-sm-imgContent1.svg";
import asset2 from "../../assets/empty-featured-sm-imgSearchLg.svg";
import asset3 from "../../assets/empty-featured-sm-imgPlus.svg";
import asset4 from "../../assets/empty-featured-md-imgContent.svg";
import asset5 from "../../assets/empty-featured-md-imgContent1.svg";
import asset6 from "../../assets/empty-featured-md-imgSearchLg.svg";
import asset7 from "../../assets/empty-featured-md-imgPlus.svg";
import asset8 from "../../assets/empty-featured-lg-imgContent.svg";
import asset9 from "../../assets/empty-featured-lg-imgContent1.svg";
import asset10 from "../../assets/empty-featured-lg-imgSearchLg.svg";
import asset11 from "../../assets/empty-featured-lg-imgPlus.svg";
import asset12 from "../../assets/empty-file-imgPage.svg";
import asset13 from "../../assets/empty-file-imgIconWrap.svg";
import asset14 from "../../assets/empty-folder-imgFrontNoise.png";
import asset15 from "../../assets/empty-folder-imgBackMain.svg";
import asset16 from "../../assets/empty-folder-imgFrontMain.svg";
import asset17 from "../../assets/empty-grid-sm-imgContent.svg";
import asset18 from "../../assets/empty-grid-sm-imgVertical.svg";
import asset19 from "../../assets/empty-grid-sm-imgHorizontal.svg";
import asset20 from "../../assets/empty-grid-md-imgContent.svg";
import asset21 from "../../assets/empty-grid-md-imgVertical.svg";
import asset22 from "../../assets/empty-grid-md-imgHorizontal.svg";
import asset23 from "../../assets/empty-grid-lg-imgContent.svg";
import asset24 from "../../assets/empty-grid-lg-imgVertical.svg";
import asset25 from "../../assets/empty-grid-lg-imgHorizontal.svg";
import type { ComponentProps } from "react";
import folderNative from "../../assets/empty-folder-native.png";
const assets = {
  "folder-native": folderNative,
  "featured-sm-imgContent": asset0,
  "featured-sm-imgContent1": asset1,
  "featured-sm-imgSearchLg": asset2,
  "featured-sm-imgPlus": asset3,
  "featured-md-imgContent": asset4,
  "featured-md-imgContent1": asset5,
  "featured-md-imgSearchLg": asset6,
  "featured-md-imgPlus": asset7,
  "featured-lg-imgContent": asset8,
  "featured-lg-imgContent1": asset9,
  "featured-lg-imgSearchLg": asset10,
  "featured-lg-imgPlus": asset11,
  "file-imgPage": asset12,
  "file-imgIconWrap": asset13,
  "folder-imgFrontNoise": asset14,
  "folder-imgBackMain": asset15,
  "folder-imgFrontMain": asset16,
  "grid-sm-imgContent": asset17,
  "grid-sm-imgVertical": asset18,
  "grid-sm-imgHorizontal": asset19,
  "grid-md-imgContent": asset20,
  "grid-md-imgVertical": asset21,
  "grid-md-imgHorizontal": asset22,
  "grid-lg-imgContent": asset23,
  "grid-lg-imgVertical": asset24,
  "grid-lg-imgHorizontal": asset25,
} as const;
export type EmptyStateAssetName = keyof typeof assets;
export function emptyStateAssetUrl(name: EmptyStateAssetName): string {
  const asset = assets[name];
  return typeof asset === "string" ? asset : asset.src;
}
export function EmptyStateAsset({
  name,
  ...props
}: Omit<ComponentProps<"img">, "src" | "alt" | "width" | "height"> & {
  name: EmptyStateAssetName;
}): React.ReactElement {
  return <img {...props} src={emptyStateAssetUrl(name)} alt="" />;
}
