import { useState } from "react";
import {
  Avatar,
  AvatarProfilePhoto,
  Breadcrumbs,
  Button,
  PageHeader,
  SectionHeaderSearch,
  type PageHeaderStyle,
} from "../src";
import { ReferenceAsset } from "../src/components/reference-assets";
import portrait from "../assets/avatar-imgSizeXlPlaceholderFalseTextFalseStatusIconOnlineIndicator.png";
import arrow from "../assets/page-header-arrow-left.svg";
const assetUrl = (asset: string | { src: string }): string =>
  typeof asset === "string" ? asset : asset.src;

export const pageHeaderSources: ReadonlyArray<
  readonly [string, PageHeaderStyle, "desktop" | "mobile", number]
> = [
  ["1239:122641", "simple", "desktop", 145],
  ["1239:123486", "simple", "mobile", 245],
  ["1239:122728", "avatar", "desktop", 117],
  ["1239:122839", "avatar", "mobile", 221],
  ["1239:124008", "banner-simple", "desktop", 421],
  ["1239:123271", "banner-simple", "mobile", 429],
  ["1239:123561", "banner-avatar", "desktop", 397],
  ["1239:122850", "banner-avatar", "mobile", 413],
  ["1239:123873", "banner-simple-centered", "desktop", 529],
  ["1239:123144", "banner-simple-centered", "mobile", 405],
  ["1239:123720", "banner-avatar-centered", "desktop", 561],
  ["1239:122995", "banner-avatar-centered", "mobile", 413],
];
export function PageHeaderFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const button = (
    label: string,
    variant: "tertiary" | "secondary" | "primary"
  ): React.ReactElement => (
    <Button
      size="md"
      variant={variant}
      leadingIcon={null}
      trailingIcon={null}
      onClick={() => setAction(label)}
    >
      {label}
    </Button>
  );
  const actions = (
    <>
      {button("Tertiary", "tertiary")}
      {button("Secondary", "secondary")}
      {button("Secondary", "secondary")}
      {button("Primary", "primary")}
    </>
  );
  const mobileActions = (
    <>
      {button("Secondary", "secondary")}
      {button("Primary", "primary")}
    </>
  );
  const breadcrumbs = (
    <Breadcrumbs
      variant="button"
      items={[
        {
          id: "home",
          label: "Home",
          href: "#home",
          icon: <ReferenceAsset name="breadcrumbsImgHomeLine" />,
        },
        { id: "quiz", label: "Quiz", href: "#quiz" },
        { id: "course", label: "Course", href: "#course" },
        { id: "attempt", label: "Attempt", href: "#attempt" },
        { id: "results", label: "Results" },
      ]}
    />
  );
  const back = (
    <a className="page-header-fixture-back" href="#quiz">
      <img src={assetUrl(arrow)} alt="" />
      Back
    </a>
  );
  const avatar = (banner: boolean, mobile: boolean): React.ReactElement =>
    banner ? (
      <AvatarProfilePhoto
        label="Diepreye Ọ̀rẹ̀kọ́yà"
        src={assetUrl(portrait)}
        size={mobile ? "md" : "lg"}
        verified
      />
    ) : (
      <Avatar label="Diepreye Ọ̀rẹ̀kọ́yà" src={assetUrl(portrait)} size="xl" />
    );
  return (
    <section className="preview-section">
      <h2>Page header source layouts</h2>
      <div className="page-header-source-scroll">
        <div className="page-header-source-grid">
          {pageHeaderSources.map(([id, variant, breakpoint, height]) => {
            const personal = variant.includes("avatar") || variant.endsWith("centered");
            return (
              <PageHeader
                key={id}
                data-source-id={id}
                data-source-height={height}
                variant={variant}
                breakpoint={breakpoint}
                title={personal ? "Diepreye Ọ̀rẹ̀kọ́yà" : "Team members"}
                supportingText={
                  personal
                    ? "chioma@PansGPT.com"
                    : "Manage your team members and their account permissions here."
                }
                breadcrumbs={breadcrumbs}
                back={back}
                avatar={avatar(variant.startsWith("banner"), false)}
                mobileAvatar={avatar(variant.startsWith("banner"), true)}
                actions={actions}
                mobileActions={mobileActions}
                search={<SectionHeaderSearch enableShortcut={false} />}
              />
            );
          })}
        </div>
      </div>
      <h2>Responsive page header</h2>
      <PageHeader
        data-testid="page-header-live"
        title="Team members"
        supportingText="Manage your team members and their account permissions here."
        breadcrumbs={breadcrumbs}
        back={back}
        actions={actions}
        mobileActions={mobileActions}
        search={
          <SectionHeaderSearch
            aria-label="Search members"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        }
      />
      <output data-testid="page-header-query">{query}</output>
      <output data-testid="page-header-action" aria-live="polite">
        {action}
      </output>
    </section>
  );
}
