import imgTypePrimaryIconBreakpointDesktop from "../../assets/notification-imgTypePrimaryIconBreakpointDesktop.png";
import imgTypeProgressIndicatorBreakpointDesktop from "../../assets/notification-imgTypeProgressIndicatorBreakpointDesktop.png";
import imgTypeGrayIconBreakpointDesktop from "../../assets/notification-imgTypeGrayIconBreakpointDesktop.png";
import imgAvatar from "../../assets/notification-imgAvatar.png";
import imgTypeImageBreakpointMobile from "../../assets/notification-imgTypeImageBreakpointMobile.png";
import imgImageWrap from "../../assets/notification-imgImageWrap.png";
import imgTypePrimaryIconBreakpointMobile from "../../assets/notification-imgTypePrimaryIconBreakpointMobile.png";
import imgTypeProgressIndicatorBreakpointMobile from "../../assets/notification-imgTypeProgressIndicatorBreakpointMobile.png";
import imgTypeGrayIconBreakpointMobile from "../../assets/notification-imgTypeGrayIconBreakpointMobile.png";
import imgTypeNoIconBreakpointMobile from "../../assets/notification-imgTypeNoIconBreakpointMobile.png";
import imgTypeAvatarBreakpointMobile from "../../assets/notification-imgTypeAvatarBreakpointMobile.png";
import imgTypeImageBreakpointDesktop from "../../assets/notification-imgTypeImageBreakpointDesktop.png";
import imgInfoCircle from "../../assets/notification-imgInfoCircle.svg";
import imgXClose from "../../assets/notification-imgXClose.svg";
import imgUploadCloud02 from "../../assets/notification-imgUploadCloud02.svg";
import imgCodepen from "../../assets/notification-imgCodepen.svg";
import imgCheckCircle from "../../assets/notification-imgCheckCircle.svg";
import imgAlertCircle from "../../assets/notification-imgAlertCircle.svg";
import imgAlertCircle1 from "../../assets/notification-imgAlertCircle1.svg";

export const notificationAssets = {
  imgTypePrimaryIconBreakpointDesktop,
  imgTypeProgressIndicatorBreakpointDesktop,
  imgTypeGrayIconBreakpointDesktop,
  imgAvatar,
  imgTypeImageBreakpointMobile,
  imgImageWrap,
  imgTypePrimaryIconBreakpointMobile,
  imgTypeProgressIndicatorBreakpointMobile,
  imgTypeGrayIconBreakpointMobile,
  imgTypeNoIconBreakpointMobile,
  imgTypeAvatarBreakpointMobile,
  imgTypeImageBreakpointDesktop,
  imgInfoCircle,
  imgXClose,
  imgUploadCloud02,
  imgCodepen,
  imgCheckCircle,
  imgAlertCircle,
  imgAlertCircle1,
} as const;
export type NotificationAssetName = keyof typeof notificationAssets;
export function notificationAssetUrl(name: NotificationAssetName): string {
  const asset = notificationAssets[name];
  return typeof asset === "string" ? asset : asset.src;
}
export function NotificationAsset({ name }: { name: NotificationAssetName }): React.ReactElement {
  return <img src={notificationAssetUrl(name)} alt="" aria-hidden="true" />;
}
