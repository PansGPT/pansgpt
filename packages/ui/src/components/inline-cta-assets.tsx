import type { ComponentProps } from "react";
import imgImage from "../../assets/inline-cta-imgImage.png";
import imgLayersTwo02 from "../../assets/inline-cta-imgLayersTwo02.svg";
import imgMail01 from "../../assets/inline-cta-imgMail01.svg";
import imgMail2 from "../../assets/inline-cta-imgMail2.svg";
import imgPage from "../../assets/inline-cta-imgPage.svg";
import imgPaymentMethodIcon from "../../assets/inline-cta-imgPaymentMethodIcon.svg";
import imgPaymentMethodIcon1 from "../../assets/inline-cta-imgPaymentMethodIcon1.svg";
import imgTypeLineSizeSmColorSuccess from "../../assets/inline-cta-imgTypeLineSizeSmColorSuccess.svg";
const assets = {
  imgImage,
  imgLayersTwo02,
  imgMail01,
  imgMail2,
  imgPage,
  imgPaymentMethodIcon,
  imgPaymentMethodIcon1,
  imgTypeLineSizeSmColorSuccess,
};
export type InlineCTAAssetName = keyof typeof assets;
export function inlineCTAAssetUrl(name: InlineCTAAssetName): string {
  const asset = assets[name];
  return typeof asset === "string" ? asset : asset.src;
}
const dimensions: Partial<Record<InlineCTAAssetName, { width: number; height: number }>> = {
  imgLayersTwo02: { width: 16, height: 16 },
  imgMail01: { width: 20, height: 20 },
  imgMail2: { width: 16, height: 16 },
  imgPage: { width: 32, height: 40 },
  imgPaymentMethodIcon: { width: 58, height: 40 },
  imgPaymentMethodIcon1: { width: 34, height: 24 },
  imgTypeLineSizeSmColorSuccess: { width: 24, height: 24 },
};
export function InlineCTAAsset({
  name,
  ...props
}: Omit<ComponentProps<"img">, "src" | "alt"> & { name: InlineCTAAssetName }): React.ReactElement {
  return (
    <img
      width={dimensions[name]?.width}
      height={dimensions[name]?.height}
      {...props}
      src={inlineCTAAssetUrl(name)}
      alt=""
    />
  );
}
