"use client";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";
import { cn } from "../utils";
import imgPlatformFacebookStyleBrandStateDefault from "../../assets/social-button-imgPlatformFacebookStyleBrandStateDefault.svg";
import imgPlatformXTwitterStyleBrandStateDefault from "../../assets/social-button-imgPlatformXTwitterStyleBrandStateDefault.svg";
import imgPlatformGoogleStyleBrandStateDefault from "../../assets/social-button-imgPlatformGoogleStyleBrandStateDefault.svg";
import imgPlatformAppleStyleBrandStateDefault from "../../assets/social-button-imgPlatformAppleStyleBrandStateDefault.svg";
import imgPlatformFigmaStyleBrandStateDefault from "../../assets/social-button-imgPlatformFigmaStyleBrandStateDefault.svg";
import imgPlatformDribbbleStyleBrandStateDefault from "../../assets/social-button-imgPlatformDribbbleStyleBrandStateDefault.svg";
import imgPlatformFacebookStyleGrayStateDefault from "../../assets/social-button-imgPlatformFacebookStyleGrayStateDefault.svg";
import imgPlatformXTwitterStyleGrayStateDefault from "../../assets/social-button-imgPlatformXTwitterStyleGrayStateDefault.svg";
import imgPlatformGoogleStyleGrayStateDefault from "../../assets/social-button-imgPlatformGoogleStyleGrayStateDefault.svg";
import imgPlatformAppleStyleGrayStateDefault from "../../assets/social-button-imgPlatformAppleStyleGrayStateDefault.svg";
import imgPlatformFigmaStyleGrayStateDefault from "../../assets/social-button-imgPlatformFigmaStyleGrayStateDefault.svg";
import imgPlatformDribbbleStyleGrayStateDefault from "../../assets/social-button-imgPlatformDribbbleStyleGrayStateDefault.svg";
import imgSocialIcon from "../../assets/social-button-imgSocialIcon.svg";
import imgSocialIcon1 from "../../assets/social-button-imgSocialIcon1.svg";
import imgSocialIcon2 from "../../assets/social-button-imgSocialIcon2.svg";
import imgSocialIcon3 from "../../assets/social-button-imgSocialIcon3.svg";
import imgSocialIcon4 from "../../assets/social-button-imgSocialIcon4.svg";
import imgSocialIcon5 from "../../assets/social-button-imgSocialIcon5.svg";
import imgSocialIcon6 from "../../assets/social-button-imgSocialIcon6.svg";
import imgSocialIcon7 from "../../assets/social-button-imgSocialIcon7.svg";
import imgSocialIcon8 from "../../assets/social-button-imgSocialIcon8.svg";
import imgSocialIcon9 from "../../assets/social-button-imgSocialIcon9.svg";
export const socialPlatforms = [
  "google",
  "facebook",
  "apple",
  "twitter",
  "figma",
  "dribbble",
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export type SocialTheme = "brand" | "color" | "gray";
type State = "default" | "hover" | "focused";
const names: Record<SocialPlatform, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
  twitter: "X",
  figma: "Figma",
  dribbble: "Dribbble",
};
const icons = {
  google: [
    imgPlatformGoogleStyleBrandStateDefault,
    imgPlatformGoogleStyleGrayStateDefault,
    imgSocialIcon2,
    imgPlatformGoogleStyleBrandStateDefault,
  ],
  facebook: [
    imgPlatformFacebookStyleBrandStateDefault,
    imgPlatformFacebookStyleGrayStateDefault,
    imgSocialIcon1,
    imgSocialIcon,
  ],
  apple: [
    imgPlatformAppleStyleBrandStateDefault,
    imgPlatformAppleStyleGrayStateDefault,
    imgSocialIcon9,
    imgSocialIcon3,
  ],
  twitter: [
    imgPlatformXTwitterStyleBrandStateDefault,
    imgPlatformXTwitterStyleGrayStateDefault,
    imgSocialIcon8,
    imgSocialIcon7,
  ],
  figma: [
    imgPlatformFigmaStyleBrandStateDefault,
    imgPlatformFigmaStyleGrayStateDefault,
    imgSocialIcon4,
    imgPlatformFigmaStyleBrandStateDefault,
  ],
  dribbble: [
    imgPlatformDribbbleStyleBrandStateDefault,
    imgPlatformDribbbleStyleGrayStateDefault,
    imgSocialIcon6,
    imgSocialIcon5,
  ],
} as const;
function url(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
export type SocialButtonProps = Omit<ComponentProps<"button">, "children"> & {
  platform?: SocialPlatform;
  theme?: SocialTheme;
  iconOnly?: boolean;
  children?: ReactNode;
};
function SocialButtonBase({
  platform = "google",
  theme = "brand",
  iconOnly = false,
  children,
  className,
  state,
  "aria-label": label,
  ...props
}: SocialButtonProps & { state?: State }): React.ReactElement {
  const art = icons[platform];
  const glyph = (
    <>
      <img
        className="p-social-normal"
        src={url(art[theme === "gray" ? 1 : theme === "brand" ? 3 : 0])}
        alt=""
      />
      {theme === "gray" && <img className="p-social-hover" src={url(art[2])} alt="" />}
    </>
  );
  const shared = {
    ...props,
    className: cn("p-social-button", className),
    "data-platform": platform,
    "data-social-theme": theme,
    "data-reference-state": state,
    leadingIcon: glyph,
    trailingIcon: null,
  };
  return iconOnly ? (
    <Button
      {...shared}
      variant="secondary"
      iconOnly
      aria-label={label ?? `Sign in with ${names[platform]}`}
    />
  ) : (
    <Button {...shared} variant="secondary" aria-label={label}>
      {children ?? `Sign in with ${names[platform]}`}
    </Button>
  );
}
export function SocialButton(props: SocialButtonProps): React.ReactElement {
  return <SocialButtonBase {...props} />;
}
export function SocialButtonReference(
  props: SocialButtonProps & { state: State }
): React.ReactElement {
  return <SocialButtonBase {...props} />;
}
export type SocialButtonGroupProps = Omit<ComponentProps<"div">, "children" | "onSelect"> & {
  layout?: "buttons" | "icons";
  theme?: SocialTheme;
  platforms?: readonly SocialPlatform[];
  disabled?: boolean;
  onSelect: (platform: SocialPlatform) => void;
};
export function SocialButtonGroup({
  layout = "buttons",
  theme = "brand",
  platforms = ["google", "facebook", "apple"],
  disabled,
  onSelect,
  className,
  "aria-label": label = "Sign in options",
  ...props
}: SocialButtonGroupProps): React.ReactElement {
  return (
    <div
      {...props}
      role="group"
      aria-label={label}
      className={cn("p-social-button-group", className)}
      data-layout={layout}
      data-social-theme={theme}
    >
      {platforms.map((platform) => (
        <SocialButton
          key={platform}
          platform={platform}
          theme={theme}
          iconOnly={layout === "icons"}
          disabled={disabled}
          onClick={() => onSelect(platform)}
        />
      ))}
    </div>
  );
}
