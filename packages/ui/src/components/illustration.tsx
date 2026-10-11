function illustrationAssetUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
import imgCard2 from "../../assets/illustration-card2.svg";
import imgPaper8 from "../../assets/illustration-paper8.svg";
import imgPaper7 from "../../assets/illustration-paper7.svg";
import imgPaper6 from "../../assets/illustration-paper6.svg";
import imgBox2 from "../../assets/illustration-box2.svg";
import imgBox1 from "../../assets/illustration-box1.svg";
import imgUploadCloud3 from "../../assets/illustration-upload-cloud3.svg";
import imgPaper5 from "../../assets/illustration-paper5.svg";
import imgPaper4 from "../../assets/illustration-paper4.svg";
import imgPaper3 from "../../assets/illustration-paper3.svg";
import imgAlertCircle1 from "../../assets/illustration-alert-circle1.svg";
import imgCard1 from "../../assets/illustration-card1.svg";
import imgSearchLg1 from "../../assets/illustration-search-lg1.svg";
import imgCircle5 from "../../assets/illustration-circle5.svg";
import imgCloud2 from "../../assets/illustration-cloud2.svg";
import imgBackgroundCircle2 from "../../assets/illustration-background-circle2.svg";
import imgCloud1 from "../../assets/illustration-cloud1.svg";
import imgCircle4 from "../../assets/illustration-circle4.svg";
import imgBackgroundCircle1 from "../../assets/illustration-background-circle1.svg";
import imgBox from "../../assets/illustration-box.svg";
import imgUploadCloud02 from "../../assets/illustration-upload-cloud02.svg";
import imgPaper2 from "../../assets/illustration-paper2.svg";
import imgPaper1 from "../../assets/illustration-paper1.svg";
import imgPaper from "../../assets/illustration-paper.svg";
import imgAlertCircle from "../../assets/illustration-alert-circle.svg";
import imgCard from "../../assets/illustration-card.svg";
import imgSearchLg from "../../assets/illustration-search-lg.svg";
import imgCloud from "../../assets/illustration-cloud.svg";
import imgCircle3 from "../../assets/illustration-circle3.svg";
import imgCircle2 from "../../assets/illustration-circle2.svg";
import imgCircle1 from "../../assets/illustration-circle1.svg";
import imgCircle from "../../assets/illustration-circle.svg";
import imgBackgroundCircle from "../../assets/illustration-background-circle.svg";

export type IllustrationProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "cloud" | "box" | "documents" | "credit-card";
  label?: string;
};

export function Illustration({
  className,
  size = "sm",
  variant = "cloud",
  label,
}: IllustrationProps): React.ReactElement {
  const style = {
    cloud: "Cloud",
    box: "Box",
    documents: "Documents",
    "credit-card": "Credit card",
  }[variant];
  const isBox = style === "Box";
  const isBoxAndLg = style === "Box" && size === "lg";
  const isBoxAndMd = style === "Box" && size === "md";
  const isBoxAndSm = style === "Box" && size === "sm";
  const isCloudAndMd = style === "Cloud" && size === "md";
  const isCloudAndSm = style === "Cloud" && size === "sm";
  const isCreditCardAndLg = style === "Credit card" && size === "lg";
  const isCreditCardAndMd = style === "Credit card" && size === "md";
  const isCreditCardAndSm = style === "Credit card" && size === "sm";
  const isDocumentsAndLg = style === "Documents" && size === "lg";
  const isDocumentsAndMd = style === "Documents" && size === "md";
  const isDocumentsAndSm = style === "Documents" && size === "sm";
  const isLgOrMd = ["lg", "md"].includes(size);
  const isMd = size === "md";
  const isMdAndIsCloudOrDocumentsOrCreditCard =
    size === "md" && ["Cloud", "Documents", "Credit card"].includes(style);
  const isSmAndIsCloudOrCreditCardOrDocuments =
    size === "sm" && ["Cloud", "Credit card", "Documents"].includes(style);
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-illustration-size={size}
      data-illustration-variant={variant}
      className={`${className ?? ""} p-illustration p-illustration-layer-138 ${isCreditCardAndMd ? "p-illustration-layer-113 p-illustration-layer-114" : isBoxAndMd ? "p-illustration-layer-115 p-illustration-layer-114" : isBoxAndSm ? "p-illustration-layer-116 p-illustration-layer-117" : isSmAndIsCloudOrCreditCardOrDocuments ? "p-illustration-layer-118 p-illustration-layer-117" : size === "md" && ["Cloud", "Documents"].includes(style) ? "p-illustration-layer-119 p-illustration-layer-114" : isBoxAndLg ? "p-illustration-layer-120 p-illustration-layer-121" : "p-illustration-layer-122 p-illustration-layer-121"}`}
      data-source-layer-id={
        isCreditCardAndMd
          ? "node-1182_1980"
          : isDocumentsAndMd
            ? "node-1182_2009"
            : isBoxAndMd
              ? "node-1182_1923"
              : isBoxAndSm
                ? "node-1182_1936"
                : isDocumentsAndSm
                  ? "node-1182_1949"
                  : isCreditCardAndSm
                    ? "node-1182_1966"
                    : isCloudAndSm
                      ? "node-1182_1994"
                      : isCloudAndMd
                        ? "node-1182_2026"
                        : isBoxAndLg
                          ? "node-1182_2727"
                          : isDocumentsAndLg
                            ? "node-1182_2741"
                            : isCreditCardAndLg
                              ? "node-1182_2759"
                              : "node-1182_2774"
      }
    >
      <div
        className={`p-illustration-layer-139 ${isBoxAndMd ? "p-illustration-layer-54 p-illustration-layer-27 p-illustration-layer-123" : isBoxAndSm ? "p-illustration-layer-55 p-illustration-layer-28 p-illustration-layer-124" : isSmAndIsCloudOrCreditCardOrDocuments ? "p-illustration-layer-55 p-illustration-layer-28 p-illustration-layer-148" : isMdAndIsCloudOrDocumentsOrCreditCard ? "p-illustration-layer-54 p-illustration-layer-27 p-illustration-layer-148" : isBoxAndLg ? "p-illustration-layer-56 p-illustration-layer-29 p-illustration-layer-123" : "p-illustration-layer-56 p-illustration-layer-29 p-illustration-layer-148"}`}
        data-source-layer-id={
          isCreditCardAndMd
            ? "node-1182_1981"
            : isDocumentsAndMd
              ? "node-1182_2010"
              : isBoxAndMd
                ? "node-1182_1924"
                : isBoxAndSm
                  ? "node-1182_1937"
                  : isDocumentsAndSm
                    ? "node-1182_1950"
                    : isCreditCardAndSm
                      ? "node-1182_1967"
                      : isCloudAndSm
                        ? "node-1182_1995"
                        : isCloudAndMd
                          ? "node-1182_2027"
                          : isBoxAndLg
                            ? "node-1182_2728"
                            : isDocumentsAndLg
                              ? "node-1182_2742"
                              : isCreditCardAndLg
                                ? "node-1182_2760"
                                : "node-1182_2775"
        }
        data-name="Background circle"
      >
        <img
          alt=""
          className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
          src={illustrationAssetUrl(
            size === "sm" ? imgBackgroundCircle2 : isMd ? imgBackgroundCircle1 : imgBackgroundCircle
          )}
        />
      </div>
      {(isLgOrMd || isBoxAndSm) && (
        <>
          <div
            className={`p-illustration-layer-139 ${isCreditCardAndMd ? "p-illustration-layer-57 p-illustration-layer-58 p-illustration-layer-148" : isDocumentsAndMd ? "p-illustration-layer-57 p-illustration-layer-58 p-illustration-layer-124" : isBoxAndMd ? "p-illustration-layer-57 p-illustration-layer-58 p-illustration-layer-91" : isBoxAndSm ? "p-illustration-layer-59 p-illustration-layer-60 p-illustration-layer-92" : isCloudAndMd ? "p-illustration-layer-57 p-illustration-layer-58 p-illustration-layer-93" : isBoxAndLg ? "p-illustration-layer-61 p-illustration-layer-62 p-illustration-layer-92" : isCreditCardAndLg ? "p-illustration-layer-63 p-illustration-layer-62 p-illustration-layer-126" : "p-illustration-layer-61 p-illustration-layer-62 p-illustration-layer-94"}`}
            data-source-layer-id={
              isCreditCardAndMd
                ? "node-1182_1982"
                : isDocumentsAndMd
                  ? "node-1182_2011"
                  : isBoxAndMd
                    ? "node-1182_1925"
                    : isBoxAndSm
                      ? "node-1182_1938"
                      : isCloudAndMd
                        ? "node-1182_2028"
                        : isBoxAndLg
                          ? "node-1182_2729"
                          : isDocumentsAndLg
                            ? "node-1182_2743"
                            : isCreditCardAndLg
                              ? "node-1182_2761"
                              : "node-1182_2776"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(isBoxAndSm ? imgCircle4 : isMd ? imgCircle1 : imgCircle)}
            />
          </div>
          <div
            className={`p-illustration-layer-139 ${isBoxAndMd ? "p-illustration-layer-95 p-illustration-layer-62 p-illustration-layer-64" : isBoxAndSm ? "p-illustration-layer-65 p-illustration-layer-66 p-illustration-layer-67" : isMdAndIsCloudOrDocumentsOrCreditCard ? "p-illustration-layer-95 p-illustration-layer-62 p-illustration-layer-68" : isBoxAndLg ? "p-illustration-layer-30 p-illustration-layer-58 p-illustration-layer-69" : isCreditCardAndLg ? "p-illustration-layer-30 p-illustration-layer-58 p-illustration-layer-70" : "p-illustration-layer-30 p-illustration-layer-58 p-illustration-layer-71"}`}
            data-source-layer-id={
              isCreditCardAndMd
                ? "node-1182_1983"
                : isDocumentsAndMd
                  ? "node-1182_2012"
                  : isBoxAndMd
                    ? "node-1182_1926"
                    : isBoxAndSm
                      ? "node-1182_1939"
                      : isCloudAndMd
                        ? "node-1182_2029"
                        : isBoxAndLg
                          ? "node-1182_2730"
                          : isDocumentsAndLg
                            ? "node-1182_2744"
                            : isCreditCardAndLg
                              ? "node-1182_2762"
                              : "node-1182_2777"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(isBoxAndSm ? imgCircle3 : isMd ? imgCircle : imgCircle1)}
            />
          </div>
          <div
            className={`p-illustration-layer-139 ${isDocumentsAndMd ? "p-illustration-layer-31 p-illustration-layer-62 p-illustration-layer-96" : isBoxAndMd ? "p-illustration-layer-32 p-illustration-layer-62 p-illustration-layer-97" : isBoxAndSm ? "p-illustration-layer-33 p-illustration-layer-66 p-illustration-layer-98" : size === "md" && ["Cloud", "Credit card"].includes(style) ? "p-illustration-layer-32 p-illustration-layer-62 p-illustration-layer-99" : isBoxAndLg ? "p-illustration-layer-72 p-illustration-layer-73 p-illustration-layer-70" : "p-illustration-layer-72 p-illustration-layer-73 p-illustration-layer-69"}`}
            data-source-layer-id={
              isCreditCardAndMd
                ? "node-1182_1984"
                : isDocumentsAndMd
                  ? "node-1182_2013"
                  : isBoxAndMd
                    ? "node-1182_1927"
                    : isBoxAndSm
                      ? "node-1182_1940"
                      : isCloudAndMd
                        ? "node-1182_2030"
                        : isBoxAndLg
                          ? "node-1182_2731"
                          : isDocumentsAndLg
                            ? "node-1182_2745"
                            : isCreditCardAndLg
                              ? "node-1182_2763"
                              : "node-1182_2778"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(isBoxAndSm ? imgCircle3 : isMd ? imgCircle : imgCircle2)}
            />
          </div>
          <div
            className={`p-illustration-layer-139 ${isBoxAndMd ? "p-illustration-layer-34 p-illustration-layer-60 p-illustration-layer-94" : isBoxAndSm ? "p-illustration-layer-35 p-illustration-layer-100 p-illustration-layer-101" : isMdAndIsCloudOrDocumentsOrCreditCard ? "p-illustration-layer-34 p-illustration-layer-60 p-illustration-layer-126" : isBoxAndLg ? "p-illustration-layer-36 p-illustration-layer-73 p-illustration-layer-102" : isDocumentsAndLg ? "p-illustration-layer-36 p-illustration-layer-73 p-illustration-layer-99" : "p-illustration-layer-36 p-illustration-layer-73 p-illustration-layer-97"}`}
            data-source-layer-id={
              isCreditCardAndMd
                ? "node-1182_1985"
                : isDocumentsAndMd
                  ? "node-1182_2014"
                  : isBoxAndMd
                    ? "node-1182_1928"
                    : isBoxAndSm
                      ? "node-1182_1941"
                      : isCloudAndMd
                        ? "node-1182_2031"
                        : isBoxAndLg
                          ? "node-1182_2732"
                          : isDocumentsAndLg
                            ? "node-1182_2746"
                            : isCreditCardAndLg
                              ? "node-1182_2764"
                              : "node-1182_2779"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(isBoxAndSm ? imgCircle5 : isMd ? imgCircle4 : imgCircle2)}
            />
          </div>
        </>
      )}
      {size === "lg" && (
        <div
          className={`p-illustration-layer-139 p-illustration-layer-37 p-illustration-layer-66 ${isBoxAndLg ? "p-illustration-layer-94" : "p-illustration-layer-126"}`}
          data-source-layer-id={
            isBoxAndLg
              ? "node-1182_2733"
              : isDocumentsAndLg
                ? "node-1182_2747"
                : isCreditCardAndLg
                  ? "node-1182_2765"
                  : "node-1182_2780"
          }
          data-name="Circle"
        >
          <img
            alt=""
            className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
            src={illustrationAssetUrl(imgCircle3)}
          />
        </div>
      )}
      {style === "Cloud" && (
        <div
          className={`p-illustration-layer-139 ${isCloudAndSm ? "p-illustration-layer-13" : isCloudAndMd ? "p-illustration-layer-140 p-illustration-layer-59 p-illustration-layer-103 p-illustration-layer-127" : "p-illustration-layer-38 p-illustration-layer-55 p-illustration-layer-103 p-illustration-layer-128"}`}
          data-source-layer-id={
            isCloudAndSm ? "node-1182_1996" : isCloudAndMd ? "node-1182_2032" : "node-1182_2781"
          }
          data-name="Cloud"
        >
          <div
            className={`p-illustration-layer-139 ${isCloudAndSm ? "p-illustration-layer-1" : isCloudAndMd ? "p-illustration-layer-14" : "p-illustration-layer-2"}`}
          >
            <img
              alt=""
              className="p-illustration-layer-149 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(
                isCloudAndSm ? imgCloud2 : isCloudAndMd ? imgCloud1 : imgCloud
              )}
            />
          </div>
        </div>
      )}
      {style === "Credit card" && (
        <div
          className={`p-illustration-layer-139 ${isCreditCardAndMd ? "p-illustration-layer-141 p-illustration-layer-74 p-illustration-layer-103 p-illustration-layer-129" : isCreditCardAndSm ? "p-illustration-layer-142 p-illustration-layer-61 p-illustration-layer-94 p-illustration-layer-130" : "p-illustration-layer-131 p-illustration-layer-75 p-illustration-layer-91 p-illustration-layer-132"}`}
          data-source-layer-id={
            isCreditCardAndMd
              ? "node-1182_1986"
              : isCreditCardAndSm
                ? "node-1182_1968"
                : "node-1182_2766"
          }
          data-name="Card"
        >
          <div
            className={`p-illustration-layer-139 ${isCreditCardAndMd ? "p-illustration-layer-3" : isCreditCardAndSm ? "p-illustration-layer-4" : "p-illustration-layer-5"}`}
          >
            <img
              alt=""
              className="p-illustration-layer-149 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(
                isCreditCardAndMd ? imgCard2 : isCreditCardAndSm ? imgCard1 : imgCard
              )}
            />
          </div>
        </div>
      )}
      {((style === "Cloud" && size === "lg") ||
        isCreditCardAndLg ||
        isCloudAndMd ||
        isCreditCardAndMd) && (
        <div
          className={`${String.raw`p-illustration-layer-139 p-illustration-layer-15 p-illustration-layer-0 p-illustration-layer-22 p-illustration-layer-12 p-illustration-layer-76 `}${isCreditCardAndMd ? "p-illustration-layer-77 p-illustration-layer-104" : isCloudAndMd ? "p-illustration-layer-77 p-illustration-layer-105" : isCreditCardAndLg ? "p-illustration-layer-78 p-illustration-layer-106" : "p-illustration-layer-78 p-illustration-layer-107"}`}
          data-source-layer-id={
            isCreditCardAndMd
              ? "node-1182_1993"
              : isCloudAndMd
                ? "node-1182_2040"
                : isCreditCardAndLg
                  ? "node-1182_2773"
                  : "node-1182_2789"
          }
          data-name="Featured icon"
        >
          <div
            className="p-illustration-layer-139 p-illustration-layer-57 p-illustration-layer-79 p-illustration-layer-93"
            data-source-layer-id={
              isCreditCardAndMd
                ? "node-I1182_1993-3465_403568"
                : isCloudAndMd
                  ? "node-I1182_2040-3465_403568"
                  : isCreditCardAndLg
                    ? "node-I1182_2773-3465_403568"
                    : "node-I1182_2789-3465_403568"
            }
            data-name="check-circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(
                style === "Credit card" && ["lg", "md"].includes(size)
                  ? imgAlertCircle
                  : imgSearchLg
              )}
            />
          </div>
        </div>
      )}
      {style === "Documents" && (
        <div
          className={`p-illustration-layer-139 ${isDocumentsAndMd ? "p-illustration-layer-39 p-illustration-layer-65 p-illustration-layer-101 p-illustration-layer-40" : isDocumentsAndSm ? "p-illustration-layer-41 p-illustration-layer-16 p-illustration-layer-123 p-illustration-layer-42" : "p-illustration-layer-23 p-illustration-layer-17 p-illustration-layer-94 p-illustration-layer-43"}`}
          data-source-layer-id={
            isDocumentsAndMd
              ? "node-1182_2015"
              : isDocumentsAndSm
                ? "node-1182_1951"
                : "node-1182_2748"
          }
          data-name="Paper"
        >
          <div
            className={`p-illustration-layer-139 p-illustration-layer-150 p-illustration-layer-44 p-illustration-layer-18 p-illustration-layer-147 ${isDocumentsAndMd ? "p-illustration-layer-80 p-illustration-layer-45 p-illustration-layer-81" : isDocumentsAndSm ? "p-illustration-layer-46 p-illustration-layer-45 p-illustration-layer-47" : "p-illustration-layer-24 p-illustration-layer-48 p-illustration-layer-25"}`}
            data-source-layer-id={
              isDocumentsAndMd
                ? "node-1182_2016"
                : isDocumentsAndSm
                  ? "node-1182_1952"
                  : "node-1182_2749"
            }
          >
            <div className="p-illustration-layer-108 p-illustration-paper-rotation">
              <div
                className={`p-illustration-layer-138 ${isDocumentsAndMd ? "p-illustration-layer-49 p-illustration-layer-143" : isDocumentsAndSm ? "p-illustration-layer-50 p-illustration-layer-51" : "p-illustration-layer-52 p-illustration-layer-53"}`}
                data-name="Paper"
              >
                <div
                  className={`p-illustration-layer-139 ${isDocumentsAndMd ? "p-illustration-layer-10" : isDocumentsAndSm ? "p-illustration-layer-11" : "p-illustration-layer-6"}`}
                >
                  <img
                    alt=""
                    className="p-illustration-layer-149 p-illustration-layer-90 p-illustration-layer-125"
                    src={illustrationAssetUrl(
                      isDocumentsAndMd ? imgPaper6 : isDocumentsAndSm ? imgPaper3 : imgPaper
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            className={`p-illustration-layer-139 p-illustration-layer-148 ${isDocumentsAndMd ? "p-illustration-layer-49 p-illustration-layer-82 p-illustration-layer-143" : isDocumentsAndSm ? "p-illustration-layer-50 p-illustration-layer-19 p-illustration-layer-51" : "p-illustration-layer-52 p-illustration-layer-20 p-illustration-layer-53"}`}
            data-source-layer-id={
              isDocumentsAndMd
                ? "node-1182_2019"
                : isDocumentsAndSm
                  ? "node-1182_1955"
                  : "node-1182_2752"
            }
            data-name="Paper"
          >
            <div
              className={`p-illustration-layer-139 ${isDocumentsAndMd ? "p-illustration-layer-10" : isDocumentsAndSm ? "p-illustration-layer-11" : "p-illustration-layer-6"}`}
            >
              <img
                alt=""
                className="p-illustration-layer-149 p-illustration-layer-90 p-illustration-layer-125"
                src={illustrationAssetUrl(
                  isDocumentsAndMd ? imgPaper7 : isDocumentsAndSm ? imgPaper4 : imgPaper1
                )}
              />
            </div>
          </div>
          <div
            className={`p-illustration-layer-139 p-illustration-layer-150 p-illustration-layer-44 p-illustration-layer-18 p-illustration-layer-148 ${isDocumentsAndMd ? "p-illustration-layer-80 p-illustration-layer-83 p-illustration-layer-81" : isDocumentsAndSm ? "p-illustration-layer-46 p-illustration-layer-21 p-illustration-layer-47" : "p-illustration-layer-24 p-illustration-layer-26 p-illustration-layer-25"}`}
            data-source-layer-id={
              isDocumentsAndMd
                ? "node-1182_2022"
                : isDocumentsAndSm
                  ? "node-1182_1958"
                  : "node-1182_2755"
            }
          >
            <div className="p-illustration-paper-rotation p-illustration-layer-133">
              <div
                className={`p-illustration-layer-138 ${isDocumentsAndMd ? "p-illustration-layer-49 p-illustration-layer-143" : isDocumentsAndSm ? "p-illustration-layer-50 p-illustration-layer-51" : "p-illustration-layer-52 p-illustration-layer-53"}`}
                data-name="Paper"
              >
                <div
                  className={`p-illustration-layer-139 ${isDocumentsAndMd ? "p-illustration-layer-10" : isDocumentsAndSm ? "p-illustration-layer-11" : "p-illustration-layer-6"}`}
                >
                  <img
                    alt=""
                    className="p-illustration-layer-149 p-illustration-layer-90 p-illustration-layer-125"
                    src={illustrationAssetUrl(
                      isDocumentsAndMd ? imgPaper8 : isDocumentsAndSm ? imgPaper5 : imgPaper2
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isBox && (
        <div
          className={`p-illustration-layer-139 p-illustration-layer-148 ${isBoxAndMd ? "p-illustration-layer-134 p-illustration-layer-84 p-illustration-layer-135" : isBoxAndSm ? "p-illustration-layer-144 p-illustration-layer-84 p-illustration-layer-145" : "p-illustration-layer-136 p-illustration-layer-85 p-illustration-layer-137"}`}
          data-source-layer-id={
            isBoxAndMd ? "node-8818_323342" : isBoxAndSm ? "node-8818_323349" : "node-1182_2734"
          }
          data-name="Box"
        >
          <div
            className={`p-illustration-layer-139 ${isBoxAndMd ? "p-illustration-layer-7" : isBoxAndSm ? "p-illustration-layer-8" : "p-illustration-layer-9"}`}
          >
            <img
              alt=""
              className="p-illustration-layer-149 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(isBoxAndMd ? imgBox2 : isBoxAndSm ? imgBox1 : imgBox)}
            />
          </div>
        </div>
      )}
      {(isDocumentsAndLg || isBox || isDocumentsAndMd) && (
        <div
          className={`${String.raw`p-illustration-layer-139 p-illustration-layer-15 p-illustration-layer-0 p-illustration-layer-22 p-illustration-layer-12 `}${isDocumentsAndMd ? "p-illustration-layer-77 p-illustration-layer-76 p-illustration-layer-109" : isBoxAndMd ? "p-illustration-layer-77 p-illustration-layer-76 p-illustration-layer-110" : isBoxAndSm ? "p-illustration-layer-86 p-illustration-layer-87 p-illustration-layer-109" : isBoxAndLg ? "p-illustration-layer-78 p-illustration-layer-76 p-illustration-layer-68" : "p-illustration-layer-78 p-illustration-layer-76 p-illustration-layer-96"}`}
          data-source-layer-id={
            isDocumentsAndMd
              ? "node-1182_2025"
              : isBoxAndMd
                ? "node-1182_1935"
                : isBoxAndSm
                  ? "node-1182_1948"
                  : isBoxAndLg
                    ? "node-1182_2740"
                    : "node-1182_2758"
          }
          data-name="Featured icon"
        >
          <div
            className={`p-illustration-layer-139 ${isBoxAndSm ? "p-illustration-layer-88 p-illustration-layer-89 p-illustration-layer-94" : "p-illustration-layer-57 p-illustration-layer-79 p-illustration-layer-93"}`}
            data-source-layer-id={
              isDocumentsAndMd
                ? "node-I1182_2025-3465_403568"
                : isBoxAndMd
                  ? "node-I1182_1935-3465_403568"
                  : isBoxAndSm
                    ? "node-I1182_1948-3465_402858"
                    : isBoxAndLg
                      ? "node-I1182_2740-3465_403568"
                      : "node-I1182_2758-3465_403568"
            }
            data-name="check-circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(isBoxAndSm ? imgUploadCloud3 : imgUploadCloud02)}
            />
          </div>
        </div>
      )}
      {isSmAndIsCloudOrCreditCardOrDocuments && (
        <>
          <div
            className={`p-illustration-layer-139 p-illustration-layer-59 p-illustration-layer-60 ${isDocumentsAndSm ? "p-illustration-layer-124" : isCreditCardAndSm ? "p-illustration-layer-148" : "p-illustration-layer-93"}`}
            data-source-layer-id={
              isDocumentsAndSm
                ? "node-1182_1961"
                : isCreditCardAndSm
                  ? "node-1182_1975"
                  : "node-1182_2004"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(imgCircle4)}
            />
          </div>
          <div
            className="p-illustration-layer-139 p-illustration-layer-65 p-illustration-layer-66 p-illustration-layer-67"
            data-source-layer-id={
              isDocumentsAndSm
                ? "node-1182_1962"
                : isCreditCardAndSm
                  ? "node-1182_1976"
                  : "node-1182_2005"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(imgCircle3)}
            />
          </div>
          <div
            className="p-illustration-layer-139 p-illustration-layer-33 p-illustration-layer-66 p-illustration-layer-99"
            data-source-layer-id={
              isDocumentsAndSm
                ? "node-1182_1963"
                : isCreditCardAndSm
                  ? "node-1182_1977"
                  : "node-1182_2006"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(imgCircle3)}
            />
          </div>
          <div
            className="p-illustration-layer-139 p-illustration-layer-35 p-illustration-layer-100 p-illustration-layer-126"
            data-source-layer-id={
              isDocumentsAndSm
                ? "node-1182_1964"
                : isCreditCardAndSm
                  ? "node-1182_1978"
                  : "node-1182_2007"
            }
            data-name="Circle"
          >
            <img
              alt=""
              className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
              src={illustrationAssetUrl(imgCircle5)}
            />
          </div>
          <div
            className={`${String.raw`p-illustration-layer-139 p-illustration-layer-15 p-illustration-layer-0 p-illustration-layer-86 p-illustration-layer-22 p-illustration-layer-12 p-illustration-layer-87 `}${isCreditCardAndSm ? "p-illustration-layer-111" : "p-illustration-layer-112"}`}
            data-source-layer-id={
              isDocumentsAndSm
                ? "node-1182_1965"
                : isCreditCardAndSm
                  ? "node-1182_1979"
                  : "node-1182_2008"
            }
            data-name="Featured icon"
          >
            <div
              className="p-illustration-layer-139 p-illustration-layer-88 p-illustration-layer-89 p-illustration-layer-94"
              data-source-layer-id={
                isDocumentsAndSm
                  ? "node-I1182_1965-3465_402858"
                  : isCreditCardAndSm
                    ? "node-I1182_1979-3465_402858"
                    : "node-I1182_2008-3465_402858"
              }
              data-name="check-circle"
            >
              <img
                alt=""
                className="p-illustration-layer-139 p-illustration-layer-149 p-illustration-layer-146 p-illustration-layer-90 p-illustration-layer-125"
                src={illustrationAssetUrl(
                  isDocumentsAndSm
                    ? imgUploadCloud3
                    : isCreditCardAndSm
                      ? imgAlertCircle1
                      : imgSearchLg1
                )}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
