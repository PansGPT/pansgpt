import type { ComponentProps } from "react";
import { cn } from "../utils";
import imgStoreGooglePlayStyleOutlineSizeMd from "../../assets/appstore-imgStoreGooglePlayStyleOutlineSizeMd.svg";
import imgStoreGooglePlayStyleOutlineSizeLg from "../../assets/appstore-imgStoreGooglePlayStyleOutlineSizeLg.svg";
import imgStoreAppStoreStyleOutlineSizeMd from "../../assets/appstore-imgStoreAppStoreStyleOutlineSizeMd.svg";
import imgStoreAppStoreStyleOutlineSizeLg from "../../assets/appstore-imgStoreAppStoreStyleOutlineSizeLg.svg";
import imgStoreGalaxyStoreStyleOutlineSizeMd from "../../assets/appstore-imgStoreGalaxyStoreStyleOutlineSizeMd.svg";
import imgStoreGalaxyStoreStyleOutlineSizeLg from "../../assets/appstore-imgStoreGalaxyStoreStyleOutlineSizeLg.svg";
import imgStoreAppGalleryStyleOutlineSizeMd from "../../assets/appstore-imgStoreAppGalleryStyleOutlineSizeMd.svg";
import imgStoreAppGalleryStyleOutlineSizeLg from "../../assets/appstore-imgStoreAppGalleryStyleOutlineSizeLg.svg";
import imgStoreGooglePlayStyleBrandSizeMd from "../../assets/appstore-imgStoreGooglePlayStyleBrandSizeMd.svg";
import imgStoreGooglePlayStyleBrandSizeLg from "../../assets/appstore-imgStoreGooglePlayStyleBrandSizeLg.svg";
import imgStoreAppStoreStyleBrandSizeMd from "../../assets/appstore-imgStoreAppStoreStyleBrandSizeMd.svg";
import imgStoreAppStoreStyleBrandSizeLg from "../../assets/appstore-imgStoreAppStoreStyleBrandSizeLg.svg";
import imgGalaxyStore from "../../assets/appstore-imgGalaxyStore.svg";
import imgAvailableOn from "../../assets/appstore-imgAvailableOn.svg";
import imgBag from "../../assets/appstore-imgBag.svg";
import imgGalaxyStore1 from "../../assets/appstore-imgGalaxyStore1.svg";
import imgAvailableOn1 from "../../assets/appstore-imgAvailableOn1.svg";
import imgBag1 from "../../assets/appstore-imgBag1.svg";
import imgStoreAppGalleryStyleBrandSizeMd from "../../assets/appstore-imgStoreAppGalleryStyleBrandSizeMd.svg";
import imgStoreAppGalleryStyleBrandSizeLg from "../../assets/appstore-imgStoreAppGalleryStyleBrandSizeLg.svg";
import imgStoreMacAppStoreStyleBrandSizeMd from "../../assets/appstore-imgStoreMacAppStoreStyleBrandSizeMd.svg";
import imgStoreMacAppStoreStyleBrandSizeLg from "../../assets/appstore-imgStoreMacAppStoreStyleBrandSizeLg.svg";
import imgStoreMacAppStoreStyleOutlineSizeMd from "../../assets/appstore-imgStoreMacAppStoreStyleOutlineSizeMd.svg";
import imgStoreMacAppStoreStyleOutlineSizeLg from "../../assets/appstore-imgStoreMacAppStoreStyleOutlineSizeLg.svg";
import galaxyGradientMd from "../../assets/appstore-gradient-md.png";
import galaxyGradientLg from "../../assets/appstore-gradient-lg.png";
const badges = {
  "googlePlay-brand-md": imgStoreGooglePlayStyleBrandSizeMd,
  "googlePlay-brand-lg": imgStoreGooglePlayStyleBrandSizeLg,
  "googlePlay-outline-md": imgStoreGooglePlayStyleOutlineSizeMd,
  "googlePlay-outline-lg": imgStoreGooglePlayStyleOutlineSizeLg,
  "appStore-brand-md": imgStoreAppStoreStyleBrandSizeMd,
  "appStore-brand-lg": imgStoreAppStoreStyleBrandSizeLg,
  "appStore-outline-md": imgStoreAppStoreStyleOutlineSizeMd,
  "appStore-outline-lg": imgStoreAppStoreStyleOutlineSizeLg,
  "macAppStore-brand-md": imgStoreMacAppStoreStyleBrandSizeMd,
  "macAppStore-brand-lg": imgStoreMacAppStoreStyleBrandSizeLg,
  "macAppStore-outline-md": imgStoreMacAppStoreStyleOutlineSizeMd,
  "macAppStore-outline-lg": imgStoreMacAppStoreStyleOutlineSizeLg,
  "galaxyStore-outline-md": imgStoreGalaxyStoreStyleOutlineSizeMd,
  "galaxyStore-outline-lg": imgStoreGalaxyStoreStyleOutlineSizeLg,
  "appGallery-brand-md": imgStoreAppGalleryStyleBrandSizeMd,
  "appGallery-brand-lg": imgStoreAppGalleryStyleBrandSizeLg,
  "appGallery-outline-md": imgStoreAppGalleryStyleOutlineSizeMd,
  "appGallery-outline-lg": imgStoreAppGalleryStyleOutlineSizeLg,
} as const;
function url(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
export const appStores = [
  "googlePlay",
  "appStore",
  "macAppStore",
  "galaxyStore",
  "appGallery",
] as const;
export type AppStore = (typeof appStores)[number];
const names: Record<AppStore, string> = {
  googlePlay: "Google Play",
  appStore: "App Store",
  macAppStore: "Mac App Store",
  galaxyStore: "Galaxy Store",
  appGallery: "AppGallery",
};
export type AppStoreBadgeProps = Omit<ComponentProps<"a">, "children"> & {
  store?: AppStore;
  variant?: "brand" | "outline";
  size?: "md" | "lg";
};
export function AppStoreBadge({
  store = "googlePlay",
  variant = "brand",
  size = "md",
  className,
  href,
  "aria-label": label = `Download on ${names[store]}`,
  ...props
}: AppStoreBadgeProps): React.ReactElement {
  const galaxy = store === "galaxyStore" && variant === "brand";
  const large = size === "lg";
  return (
    <a
      {...props}
      href={href}
      role={href ? undefined : "img"}
      aria-label={label}
      className={cn("p-app-store-badge", className)}
      data-store={store}
      data-size={size}
      data-variant={variant}
    >
      {galaxy ? (
        <span className="p-app-store-galaxy-artwork" aria-hidden="true">
          <img
            className="p-app-store-galaxy-name"
            src={url(large ? imgGalaxyStore1 : imgGalaxyStore)}
            alt=""
          />
          <img
            className="p-app-store-galaxy-caption"
            src={url(large ? imgAvailableOn1 : imgAvailableOn)}
            alt=""
          />
          <img
            className="p-app-store-galaxy-gradient"
            src={url(large ? galaxyGradientLg : galaxyGradientMd)}
            alt=""
          />
          <img className="p-app-store-galaxy-bag" src={url(large ? imgBag1 : imgBag)} alt="" />
        </span>
      ) : (
        <img
          src={url(badges[`${store}-${variant}-${size}` as keyof typeof badges])}
          alt=""
          aria-hidden="true"
        />
      )}
    </a>
  );
}
