import spinnerimgLoadingCircle from "../../assets/spinner-imgLoadingCircle.svg";
import dotSm from "../../assets/spinner-dot-sm.png";
import dotMd from "../../assets/spinner-dot-md.png";
import dotLg from "../../assets/spinner-dot-lg.png";
import dotXl from "../../assets/spinner-dot-xl.png";
import spinnerimgLoadingCircle1 from "../../assets/spinner-imgLoadingCircle1.svg";
import spinnerimgLoadingCircle2 from "../../assets/spinner-imgLoadingCircle2.svg";
import spinnerimgLoadingCircle3 from "../../assets/spinner-imgLoadingCircle3.svg";
import spinnerimgLoadingCircle4 from "../../assets/spinner-imgLoadingCircle4.svg";
import spinnerimgLoadingCircle5 from "../../assets/spinner-imgLoadingCircle5.svg";
import spinnerimgLoadingCircle6 from "../../assets/spinner-imgLoadingCircle6.svg";
import spinnerimgLoadingCircle7 from "../../assets/spinner-imgLoadingCircle7.svg";
import spinnerimgLoadingCircle8 from "../../assets/spinner-imgLoadingCircle8.svg";
import spinnerimgLoadingCircle9 from "../../assets/spinner-imgLoadingCircle9.svg";
import spinnerimgLoadingCircle10 from "../../assets/spinner-imgLoadingCircle10.svg";
import spinnerimgLoadingCircle11 from "../../assets/spinner-imgLoadingCircle11.svg";
import circleimgRing from "../../assets/progress-circle-imgRing.svg";
import circleimgRing1 from "../../assets/progress-circle-imgRing1.svg";
import circleimgRing2 from "../../assets/progress-circle-imgRing2.svg";
import circleimgRing3 from "../../assets/progress-circle-imgRing3.svg";
import circleimgRing4 from "../../assets/progress-circle-imgRing4.svg";
import circleimgRing5 from "../../assets/progress-circle-imgRing5.svg";
import circleimgRing6 from "../../assets/progress-circle-imgRing6.svg";
import circleimgRing7 from "../../assets/progress-circle-imgRing7.svg";
import circleimgBackground from "../../assets/progress-circle-imgBackground.svg";
import circleimgLine from "../../assets/progress-circle-imgLine.svg";
import circleimgBackground1 from "../../assets/progress-circle-imgBackground1.svg";
import circleimgLine1 from "../../assets/progress-circle-imgLine1.svg";

const assets = {
  dotSm,
  dotMd,
  dotLg,
  dotXl,
  spinnerimgLoadingCircle,
  spinnerimgLoadingCircle1,
  spinnerimgLoadingCircle2,
  spinnerimgLoadingCircle3,
  spinnerimgLoadingCircle4,
  spinnerimgLoadingCircle5,
  spinnerimgLoadingCircle6,
  spinnerimgLoadingCircle7,
  spinnerimgLoadingCircle8,
  spinnerimgLoadingCircle9,
  spinnerimgLoadingCircle10,
  spinnerimgLoadingCircle11,
  circleimgRing,
  circleimgRing1,
  circleimgRing2,
  circleimgRing3,
  circleimgRing4,
  circleimgRing5,
  circleimgRing6,
  circleimgRing7,
  circleimgBackground,
  circleimgLine,
  circleimgBackground1,
  circleimgLine1,
} as const;
export type IndicatorAssetName = keyof typeof assets;
export function IndicatorAsset({ name }: { name: IndicatorAssetName }): React.ReactElement {
  const asset = assets[name];
  return <img src={typeof asset === "string" ? asset : asset.src} alt="" aria-hidden="true" />;
}
