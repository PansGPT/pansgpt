import dropzoneImgUploadCloud02 from "../../assets/dropzone-imgUploadCloud02.svg";
import dropzoneImgPage from "../../assets/dropzone-imgPage.svg";
import dropzoneImgCursor from "../../assets/dropzone-imgCursor.svg";
import uploadItemImgPage from "../../assets/upload-item-imgPage.svg";
import uploadItemImgPage1 from "../../assets/upload-item-imgPage1.svg";
import uploadItemImgPage2 from "../../assets/upload-item-imgPage2.svg";
import uploadItemImgDivider from "../../assets/upload-item-imgDivider.svg";
import uploadItemImgCheckCircle from "../../assets/upload-item-imgCheckCircle.svg";
import uploadItemImgTrash01 from "../../assets/upload-item-imgTrash01.svg";
import uploadItemImgUploadCloud02 from "../../assets/upload-item-imgUploadCloud02.svg";
import uploadItemImgFile04 from "../../assets/upload-item-imgFile04.svg";
import uploadItemImgXCircle from "../../assets/upload-item-imgXCircle.svg";
import uploadItemImgFile5 from "../../assets/upload-item-imgFile5.svg";
import uploadItemImgDivider1 from "../../assets/upload-item-imgDivider1.svg";
import uploadImgUploadCloud02 from "../../assets/upload-imgUploadCloud02.svg";
import uploadImgPage from "../../assets/upload-imgPage.svg";
import uploadImgPage1 from "../../assets/upload-imgPage1.svg";
import uploadImgPage2 from "../../assets/upload-imgPage2.svg";
import uploadImgDivider from "../../assets/upload-imgDivider.svg";
import uploadImgCheckCircle from "../../assets/upload-imgCheckCircle.svg";
import uploadImgTrash01 from "../../assets/upload-imgTrash01.svg";
import uploadImgUploadCloud3 from "../../assets/upload-imgUploadCloud3.svg";
import uploadImgPage3 from "../../assets/upload-imgPage3.svg";
import uploadImgPage4 from "../../assets/upload-imgPage4.svg";

const uploadAssets = {
  dropzoneImgUploadCloud02,
  dropzoneImgPage,
  dropzoneImgCursor,
  uploadItemImgPage,
  uploadItemImgPage1,
  uploadItemImgPage2,
  uploadItemImgDivider,
  uploadItemImgCheckCircle,
  uploadItemImgTrash01,
  uploadItemImgUploadCloud02,
  uploadItemImgFile04,
  uploadItemImgXCircle,
  uploadItemImgFile5,
  uploadItemImgDivider1,
  uploadImgUploadCloud02,
  uploadImgPage,
  uploadImgPage1,
  uploadImgPage2,
  uploadImgDivider,
  uploadImgCheckCircle,
  uploadImgTrash01,
  uploadImgUploadCloud3,
  uploadImgPage3,
  uploadImgPage4,
} as const;
export type UploadAssetName = keyof typeof uploadAssets;
export function UploadAsset({ name }: { name: UploadAssetName }): React.ReactElement {
  const asset = uploadAssets[name];
  return <img src={typeof asset === "string" ? asset : asset.src} alt="" aria-hidden="true" />;
}
