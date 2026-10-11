import imageSquare from "../../assets/avatar-image-imgImage.png";
import imagePortrait from "../../assets/avatar-image-imgImage1.png";
import profileAsset0 from "../../assets/avatar-profile-imgSize2Xl.svg";
import profileAsset1 from "../../assets/avatar-profile-imgSize3Xl.svg";
import profileAsset2 from "../../assets/avatar-profile-imgSize4Xl.svg";
import profileAsset3 from "../../assets/avatar-profile-imgContent.png";
import profileAsset4 from "../../assets/avatar-profile-imgUser01.svg";
import profileAsset5 from "../../assets/avatar-profile-imgUser2.svg";
import profileAsset6 from "../../assets/avatar-profile-imgUser3.svg";
import asset0 from "../../assets/avatar-group-imgTypeHandPoint.svg";
import asset1 from "../../assets/avatar-group-imgPlus.svg";
import asset2 from "../../assets/avatar-group-imgPlus1.svg";
import asset3 from "../../assets/avatar-group-imgAvatar.png";
import asset4 from "../../assets/avatar-group-imgAvatar1.png";
import asset5 from "../../assets/avatar-group-imgAvatar2.png";
import asset6 from "../../assets/avatar-group-imgAvatar3.png";
import asset7 from "../../assets/avatar-group-imgAvatar4.png";
import asset8 from "../../assets/avatar-group-imgAvatar5.png";
import asset9 from "../../assets/avatar-group-imgAvatar6.png";
import asset10 from "../../assets/avatar-group-imgAvatar7.png";
import asset11 from "../../assets/avatar-group-imgAvatar8.png";
import asset12 from "../../assets/avatar-group-imgAvatar9.png";
import asset13 from "../../assets/avatar-add-imgTypeHandPoint.svg";
import asset14 from "../../assets/avatar-add-imgPlus.svg";
import asset15 from "../../assets/avatar-add-imgPlus1.svg";
import asset16 from "../../assets/avatar-add-imgPlus2.svg";
import asset17 from "../../assets/avatar-add-imgPlus3.svg";
import asset18 from "../../assets/avatar-add-imgPlus4.svg";
import asset19 from "../../assets/avatar-add-imgTooltip.svg";
import asset20 from "../../assets/avatar-add-imgPlus5.svg";
import asset21 from "../../assets/avatar-label-imgSizeSm.svg";
import asset22 from "../../assets/avatar-label-imgSizeMd.svg";
import asset23 from "../../assets/avatar-label-imgSizeLg.svg";
import asset24 from "../../assets/avatar-label-imgSizeXl.svg";
import asset25 from "../../assets/avatar-label-imgSizeSm1.png";
import asset26 from "../../assets/avatar-label-imgSizeXlPlaceholderFalseTextFalseStatusIconCompany.png";
const assets = {
  avatarimage_imgImage: imageSquare,
  avatarimage_imgImage1: imagePortrait,
  avatarprofile_imgSize2Xl: profileAsset0,
  avatarprofile_imgSize3Xl: profileAsset1,
  avatarprofile_imgSize4Xl: profileAsset2,
  avatarprofile_imgContent: profileAsset3,
  avatarprofile_imgUser01: profileAsset4,
  avatarprofile_imgUser2: profileAsset5,
  avatarprofile_imgUser3: profileAsset6,
  avatargroup_imgTypeHandPoint: asset0,
  avatargroup_imgPlus: asset1,
  avatargroup_imgPlus1: asset2,
  avatargroup_imgAvatar: asset3,
  avatargroup_imgAvatar1: asset4,
  avatargroup_imgAvatar2: asset5,
  avatargroup_imgAvatar3: asset6,
  avatargroup_imgAvatar4: asset7,
  avatargroup_imgAvatar5: asset8,
  avatargroup_imgAvatar6: asset9,
  avatargroup_imgAvatar7: asset10,
  avatargroup_imgAvatar8: asset11,
  avatargroup_imgAvatar9: asset12,
  avataradd_imgTypeHandPoint: asset13,
  avataradd_imgPlus: asset14,
  avataradd_imgPlus1: asset15,
  avataradd_imgPlus2: asset16,
  avataradd_imgPlus3: asset17,
  avataradd_imgPlus4: asset18,
  avataradd_imgTooltip: asset19,
  avataradd_imgPlus5: asset20,
  avatarlabel_imgSizeSm: asset21,
  avatarlabel_imgSizeMd: asset22,
  avatarlabel_imgSizeLg: asset23,
  avatarlabel_imgSizeXl: asset24,
  avatarlabel_imgSizeSm1: asset25,
  avatarlabel_imgSizeXlPlaceholderFalseTextFalseStatusIconCompany: asset26,
} as const;
export type AvatarPatternAssetName = keyof typeof assets;
export function avatarPatternAssetUrl(name: AvatarPatternAssetName): string {
  const a = assets[name];
  return typeof a === "string" ? a : a.src;
}
export function AvatarPatternAsset({
  name,
  className,
}: {
  name: AvatarPatternAssetName;
  className?: string;
}): React.ReactElement {
  return <img src={avatarPatternAssetUrl(name)} alt="" aria-hidden="true" className={className} />;
}
