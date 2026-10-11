import type { ComponentProps } from "react";
import placeholder from "../../assets/button-imgPlaceholder.svg";
import trailingPlaceholder from "../../assets/button-imgPlaceholder1.svg";
import mail from "../../assets/input-imgMail01.svg";
import help from "../../assets/input-imgOpenFalseSupportingTextFalseTooltipTopNoArrow.svg";
import resize from "../../assets/textarea-imgResizeHandle.svg";
import loading from "../../assets/loading-imgLoadingCircle.svg";
import buttonLoading from "../../assets/button-loading.svg";
import check from "../../assets/1097-63713-imgCheck.svg";
import minus from "../../assets/1224-6859-imgMinus.svg";
import close from "../../assets/modal-imgXClose.svg";
import chevronDown from "../../assets/select-imgChevronDown.svg";
import success from "../../assets/modal-imgCheckCircle.svg";
import patternMask from "../../assets/modal-imgContent.svg";
import pattern from "../../assets/modal-imgContent1.svg";
import selectCheckSmall from "../../assets/select-check-sm.svg";
import selectCheckMedium from "../../assets/select-check-md.svg";
import selectCheckSmallDisabled from "../../assets/select-check-sm-disabled.svg";
import selectCheckMediumDisabled from "../../assets/select-check-md-disabled.svg";

export const assets = {
  placeholder,
  trailingPlaceholder,
  mail,
  help,
  resize,
  loading,
  check,
  minus,
  close,
  chevronDown,
  success,
  patternMask,
  pattern,
  buttonLoading,
  selectCheckSmall,
  selectCheckMedium,
  selectCheckSmallDisabled,
  selectCheckMediumDisabled,
} as const;
export type AssetName = keyof typeof assets;

export function assetUrl(name: AssetName): string {
  const asset = assets[name];
  return typeof asset === "string" ? asset : asset.src;
}

export function FigmaAsset({
  name,
  alt = "",
  ...props
}: Omit<ComponentProps<"img">, "src" | "width" | "height"> & {
  name: AssetName;
}): React.ReactElement {
  return <img {...props} src={assetUrl(name)} alt={alt} />;
}
