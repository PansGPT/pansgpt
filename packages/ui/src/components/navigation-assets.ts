import dropdownImgSizeMdPlaceholderFalseTextFalseStatusIconFalse from "../../assets/dropdown-imgSizeMdPlaceholderFalseTextFalseStatusIconFalse.png";
import dropdownImgDotsVertical from "../../assets/dropdown-imgDotsVertical.svg";
import dropdownImgUser01 from "../../assets/dropdown-imgUser01.svg";
import dropdownImgSettings01 from "../../assets/dropdown-imgSettings01.svg";
import dropdownImgZap from "../../assets/dropdown-imgZap.svg";
import dropdownImgDropdownListItem from "../../assets/dropdown-imgDropdownListItem.svg";
import dropdownImgHomeLine from "../../assets/dropdown-imgHomeLine.svg";
import dropdownImgUsers01 from "../../assets/dropdown-imgUsers01.svg";
import dropdownImgUserPlus01 from "../../assets/dropdown-imgUserPlus01.svg";
import dropdownImgLayersTwo01 from "../../assets/dropdown-imgLayersTwo01.svg";
import dropdownImgMessageSmileCircle from "../../assets/dropdown-imgMessageSmileCircle.svg";
import dropdownImgHelpCircle from "../../assets/dropdown-imgHelpCircle.svg";
import dropdownImgContainer from "../../assets/dropdown-imgContainer.svg";
import dropdownImgLogOut01 from "../../assets/dropdown-imgLogOut01.svg";
import dropdownImgDotsVertical1 from "../../assets/dropdown-imgDotsVertical1.svg";
import dropdownImgChevronDown from "../../assets/dropdown-imgChevronDown.svg";
import dropdownItemImgPlaceholder from "../../assets/dropdown-item-imgPlaceholder.svg";
import dropdownItemImgPlaceholder1 from "../../assets/dropdown-item-imgPlaceholder1.svg";
import dropdownItemImgIconFalseCheckboxFalseStateDefaultDividerTrue from "../../assets/dropdown-item-imgIconFalseCheckboxFalseStateDefaultDividerTrue.svg";
import dropdownHeaderImgAvatar from "../../assets/dropdown-header-imgAvatar.png";
import paginationImgArrowLeft from "../../assets/pagination-imgArrowLeft.svg";
import paginationImgArrowRight from "../../assets/pagination-imgArrowRight.svg";
import paginationImgArrowLeft1 from "../../assets/pagination-imgArrowLeft1.svg";
import paginationImgArrowRight1 from "../../assets/pagination-imgArrowRight1.svg";
import paginationImgArrowLeft2 from "../../assets/pagination-imgArrowLeft2.svg";
import paginationImgArrowRight2 from "../../assets/pagination-imgArrowRight2.svg";
import paginationImgArrowLeft3 from "../../assets/pagination-imgArrowLeft3.svg";
import paginationGroupImgArrowRight from "../../assets/pagination-group-imgArrowRight.svg";
import paginationGroupImgArrowLeft from "../../assets/pagination-group-imgArrowLeft.svg";
export const navigationAssets = {
  dropdownImgSizeMdPlaceholderFalseTextFalseStatusIconFalse,
  dropdownImgDotsVertical,
  dropdownImgUser01,
  dropdownImgSettings01,
  dropdownImgZap,
  dropdownImgDropdownListItem,
  dropdownImgHomeLine,
  dropdownImgUsers01,
  dropdownImgUserPlus01,
  dropdownImgLayersTwo01,
  dropdownImgMessageSmileCircle,
  dropdownImgHelpCircle,
  dropdownImgContainer,
  dropdownImgLogOut01,
  dropdownImgDotsVertical1,
  dropdownImgChevronDown,
  dropdownItemImgPlaceholder,
  dropdownItemImgPlaceholder1,
  dropdownItemImgIconFalseCheckboxFalseStateDefaultDividerTrue,
  dropdownHeaderImgAvatar,
  paginationImgArrowLeft,
  paginationImgArrowRight,
  paginationImgArrowLeft1,
  paginationImgArrowRight1,
  paginationImgArrowLeft2,
  paginationImgArrowRight2,
  paginationImgArrowLeft3,
  paginationGroupImgArrowRight,
  paginationGroupImgArrowLeft,
} as const;
export type NavigationAssetName = keyof typeof navigationAssets;
export function navigationAssetUrl(name: NavigationAssetName): string {
  const asset = navigationAssets[name];
  return typeof asset === "string" ? asset : asset.src;
}
