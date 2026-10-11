import buttonGroupImgPlaceholder from "../../assets/button-group-imgPlaceholder.svg";
import buttonGroupImgArrowLeft from "../../assets/button-group-imgArrowLeft.svg";
import buttonGroupImgPlus from "../../assets/button-group-imgPlus.svg";
import buttonGroupImgArrowRight from "../../assets/button-group-imgArrowRight.svg";
import buttonGroupBaseImgSizeMdOutlineFalse from "../../assets/button-group-base-imgSizeMdOutlineFalse.svg";
import buttonGroupBaseImgPlaceholder from "../../assets/button-group-base-imgPlaceholder.svg";
import buttonGroupBaseImgPlaceholder1 from "../../assets/button-group-base-imgPlaceholder1.svg";
import buttonGroupBaseImgPlaceholder2 from "../../assets/button-group-base-imgPlaceholder2.svg";
import buttonGroupBaseImgDot from "../../assets/button-group-base-imgDot.svg";
import contentDividerImgArrowLeft from "../../assets/content-divider-imgArrowLeft.svg";
import contentDividerImgPlus from "../../assets/content-divider-imgPlus.svg";
import contentDividerImgArrowRight from "../../assets/content-divider-imgArrowRight.svg";
import contentDividerImgPlus1 from "../../assets/content-divider-imgPlus1.svg";
export const groupAssets = {
  buttonGroupImgPlaceholder,
  buttonGroupImgArrowLeft,
  buttonGroupImgPlus,
  buttonGroupImgArrowRight,
  buttonGroupBaseImgSizeMdOutlineFalse,
  buttonGroupBaseImgPlaceholder,
  buttonGroupBaseImgPlaceholder1,
  buttonGroupBaseImgPlaceholder2,
  buttonGroupBaseImgDot,
  contentDividerImgArrowLeft,
  contentDividerImgPlus,
  contentDividerImgArrowRight,
  contentDividerImgPlus1,
} as const;
export type GroupAssetName = keyof typeof groupAssets;
export function GroupAsset({ name }: { name: GroupAssetName }): React.ReactElement {
  const asset = groupAssets[name];
  return <img src={typeof asset === "string" ? asset : asset.src} alt="" aria-hidden="true" />;
}
