import imgXClose from "../../assets/alert-imgXClose.svg";
import imgXClose1 from "../../assets/alert-imgXClose1.svg";
import imgInfoCircle from "../../assets/alert-imgInfoCircle.svg";
import imgInfoCircle1 from "../../assets/alert-imgInfoCircle1.svg";
import imgInfoCircle2 from "../../assets/alert-imgInfoCircle2.svg";
import imgAlertCircle from "../../assets/alert-imgAlertCircle.svg";
import imgAlertCircle1 from "../../assets/alert-imgAlertCircle1.svg";
import imgCheckCircle from "../../assets/alert-imgCheckCircle.svg";
import imgAlertCircle2 from "../../assets/alert-imgAlertCircle2.svg";
import imgCheckCircle1 from "../../assets/alert-imgCheckCircle1.svg";

export const alertAssets = {
  imgXClose,
  imgXClose1,
  imgInfoCircle,
  imgInfoCircle1,
  imgInfoCircle2,
  imgAlertCircle,
  imgAlertCircle1,
  imgCheckCircle,
  imgAlertCircle2,
  imgCheckCircle1,
} as const;
export type AlertAssetName = keyof typeof alertAssets;
export function AlertAsset({ name }: { name: AlertAssetName }): React.ReactElement {
  const asset = alertAssets[name];
  return <img src={typeof asset === "string" ? asset : asset.src} alt="" aria-hidden="true" />;
}
