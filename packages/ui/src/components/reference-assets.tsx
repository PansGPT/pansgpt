import breadcrumbsImgHomeLine from "../../assets/breadcrumbs-imgHomeLine.svg";
import breadcrumbsImgSlashDivider from "../../assets/breadcrumbs-imgSlashDivider.svg";
import breadcrumbsImgChevronRight from "../../assets/breadcrumbs-imgChevronRight.svg";
import avatarImgSizeSm from "../../assets/avatar-imgSizeSm.svg";
import avatarImgSizeXs from "../../assets/avatar-imgSizeXs.svg";
import avatarImgSizeMd from "../../assets/avatar-imgSizeMd.svg";
import avatarImgSizeLg from "../../assets/avatar-imgSizeLg.svg";
import avatarImgSizeXl from "../../assets/avatar-imgSizeXl.svg";
import avatarImgSize2Xl from "../../assets/avatar-imgSize2Xl.svg";
import avatarImgSizeXs1 from "../../assets/avatar-imgSizeXs1.png";
import avatarImgSizeXlPlaceholderFalseTextFalseStatusIconOnlineIndicator from "../../assets/avatar-imgSizeXlPlaceholderFalseTextFalseStatusIconOnlineIndicator.png";
import avatarImgUser01 from "../../assets/avatar-imgUser01.svg";
import avatarImgUser2 from "../../assets/avatar-imgUser2.svg";
import avatarImgUser3 from "../../assets/avatar-imgUser3.svg";
import avatarImgUser4 from "../../assets/avatar-imgUser4.svg";
import avatarImgUser5 from "../../assets/avatar-imgUser5.svg";
import radioImgCheck from "../../assets/radio-imgCheck.svg";
import radioImgLayersTwo01 from "../../assets/radio-imgLayersTwo01.svg";
import radioImgLayersThree01 from "../../assets/radio-imgLayersThree01.svg";
import radioImgZap from "../../assets/radio-imgZap.svg";
import radioImgZapFast from "../../assets/radio-imgZapFast.svg";
import radioImgRocket01 from "../../assets/radio-imgRocket01.svg";
import linkHoverImgPlaceholder from "../../assets/link-hover-imgPlaceholder.svg";
import linkHoverImgPlaceholder1 from "../../assets/link-hover-imgPlaceholder1.svg";
import tagCloseImgXClose from "../../assets/tag-close-imgXClose.svg";
import tagCountryImgAu from "../../assets/tag-country-imgAu.svg";
import tagCheckboxImgCheck from "../../assets/tag-checkbox-imgCheck.svg";
import tagCheckboxImgCheck1 from "../../assets/tag-checkbox-imgCheck1.svg";
import tagCheckboxImgCheck2 from "../../assets/tag-checkbox-imgCheck2.svg";
import tagCheckboxImgCheck3 from "../../assets/tag-checkbox-imgCheck3.svg";
import tagCheckboxImgCheck4 from "../../assets/tag-checkbox-imgCheck4.svg";
import tagCheckboxImgCheck5 from "../../assets/tag-checkbox-imgCheck5.svg";
import tagCloseAllImgXClose from "../../assets/tag-close-all-imgXClose.svg";
import tagCloseAllImgXClose1 from "../../assets/tag-close-all-imgXClose1.svg";
import tagCloseAllImgXClose2 from "../../assets/tag-close-all-imgXClose2.svg";
import tagCloseAllImgXClose3 from "../../assets/tag-close-all-imgXClose3.svg";
import tagCloseAllImgXClose4 from "../../assets/tag-close-all-imgXClose4.svg";
import tagCloseAllImgXClose5 from "../../assets/tag-close-all-imgXClose5.svg";
export const referenceAssets = {
  tagCloseAllImgXClose,
  tagCloseAllImgXClose1,
  tagCloseAllImgXClose2,
  tagCloseAllImgXClose3,
  tagCloseAllImgXClose4,
  tagCloseAllImgXClose5,
  tagCloseImgXClose,
  tagCountryImgAu,
  tagCheckboxImgCheck,
  tagCheckboxImgCheck1,
  tagCheckboxImgCheck2,
  tagCheckboxImgCheck3,
  tagCheckboxImgCheck4,
  tagCheckboxImgCheck5,
  breadcrumbsImgHomeLine,
  breadcrumbsImgSlashDivider,
  breadcrumbsImgChevronRight,
  avatarImgSizeSm,
  avatarImgSizeXs,
  avatarImgSizeMd,
  avatarImgSizeLg,
  avatarImgSizeXl,
  avatarImgSize2Xl,
  avatarImgSizeXs1,
  avatarImgSizeXlPlaceholderFalseTextFalseStatusIconOnlineIndicator,
  avatarImgUser01,
  avatarImgUser2,
  avatarImgUser3,
  avatarImgUser4,
  avatarImgUser5,
  radioImgCheck,
  radioImgLayersTwo01,
  radioImgLayersThree01,
  radioImgZap,
  radioImgZapFast,
  radioImgRocket01,
  linkHoverImgPlaceholder,
  linkHoverImgPlaceholder1,
} as const;
export type ReferenceAssetName = keyof typeof referenceAssets;
export function referenceAssetUrl(name: ReferenceAssetName): string {
  const asset = referenceAssets[name];
  return typeof asset === "string" ? asset : asset.src;
}
export function ReferenceAsset({
  name,
  alt = "",
  ...props
}: Omit<ComponentProps<"img">, "src" | "width" | "height"> & {
  name: ReferenceAssetName;
}): React.ReactElement {
  return <img {...props} src={referenceAssetUrl(name)} alt={alt} />;
}
import type { ComponentProps } from "react";
