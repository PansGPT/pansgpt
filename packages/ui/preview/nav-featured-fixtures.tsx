import type { ReactNode } from "react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Input,
  NavFeaturedCard,
  NavFeaturedCardActions,
  NavFeaturedCardGroup,
  NavFeaturedCardIcon,
  NavFeaturedCardText,
  ProgressBar,
  VideoOverlayAction,
  VideoPlayerSurface,
  type NavFeaturedCardType,
} from "../src";
import {
  ApplicationNavigationAsset,
  applicationNavigationAssetUrl,
} from "../src/components/application-navigation-assets";
import { navFeaturedContents } from "./nav-featured-content-data";
const types: Record<string, NavFeaturedCardType> = {
  "Progress bar": "progress-bar",
  Image: "image",
  "Progress circle": "progress-circle",
  "Cookie preferences": "cookies",
  "Current projects": "projects",
  "Referral link": "referral",
  "Onboarding steps": "onboarding",
  "Upgrade CTA": "upgrade",
  "Support CTA": "support",
  "Event CTA": "event",
  Message: "message",
  "Free trial CTA": "trial",
  "QR code": "qr-code",
};
export function NavFeaturedFixture({
  name,
  onAction,
}: {
  name: string;
  onAction: (value: string) => void;
}): React.ReactElement {
  const sourceType = name.replace("Type=", "");
  const source = navFeaturedContents.find((item) => item.type === sourceType)!;
  const type = types[sourceType]!;
  const texts = source.texts.map((item) => item.text);
  const link = (label: string, brand = true): ReactNode => (
    <Button
      variant={brand ? "link-color" : "link-gray"}
      leadingIcon={null}
      trailingIcon={null}
      onClick={() => onAction(label)}
    >
      {label}
    </Button>
  );
  const button = (label: string, primary = false, icon?: ReactNode): ReactNode => (
    <Button
      variant={primary ? "primary" : "secondary"}
      size="sm"
      leadingIcon={icon ?? null}
      trailingIcon={null}
      onClick={() => onAction(label)}
    >
      {label}
    </Button>
  );
  const text = (
    title: string,
    supportingText: ReactNode,
    badge?: ReactNode,
    meta?: ReactNode
  ): ReactNode => (
    <NavFeaturedCardText title={title} supportingText={supportingText} badge={badge} meta={meta} />
  );
  let children: ReactNode;
  if (type === "progress-bar" || type === "image")
    children = (
      <>
        {text(texts[0]!, texts[1])}
        {type === "progress-bar" ? (
          <ProgressBar value={83.37} aria-label="Used storage" />
        ) : (
          <VideoPlayerSurface label="New feature preview" size="sm" responsive>
            <img
              className="p-video-poster"
              src={applicationNavigationAssetUrl("source6_imgSizeSmPlayingFalse")}
              alt=""
            />
            <VideoOverlayAction small onClick={() => onAction("Play feature preview")} />
          </VideoPlayerSurface>
        )}
        <NavFeaturedCardActions>
          {link(texts[2]!, false)}
          {link(texts[3]!)}
        </NavFeaturedCardActions>
      </>
    );
  else if (type === "progress-circle")
    children = (
      <>
        <NavFeaturedCardGroup>
          <div className="nav-featured-source-circle" role="img" aria-label="Used storage: 80%">
            <ApplicationNavigationAsset name="source6_imgBackground" />
            <ApplicationNavigationAsset name="source6_imgLine" />
            <span>80%</span>
          </div>
          {text(texts[1]!, texts[2])}
        </NavFeaturedCardGroup>
        <NavFeaturedCardActions>
          {link(texts[3]!, false)}
          {link(texts[4]!)}
        </NavFeaturedCardActions>
      </>
    );
  else if (type === "cookies")
    children = (
      <>
        <NavFeaturedCardGroup>
          <span className="nav-featured-cookie-icon" aria-hidden="true">
            <ApplicationNavigationAsset name="source6_imgAlertCircle" />
          </span>
          {text(
            texts[0]!,
            <>
              We use{" "}
              <a href="#cookies" onClick={() => onAction("Cookie policy")}>
                cookies
              </a>{" "}
              to analyze traffic, remember your preferences, and improve your experience.
            </>
          )}
        </NavFeaturedCardGroup>
        <NavFeaturedCardActions>
          {link(texts[2]!, false)}
          {link(texts[3]!)}
        </NavFeaturedCardActions>
      </>
    );
  else if (type === "projects")
    children = (
      <>
        <NavFeaturedCardGroup>
          <strong>{texts[0]}</strong>
          <div className="nav-featured-projects">
            {texts.slice(1, 4).map((label, i) => (
              <a href={`#project-${i + 1}`} key={label} onClick={() => onAction(label)}>
                <ApplicationNavigationAsset
                  name={
                    i === 0 ? "source6_imgDot" : i === 1 ? "source6_imgDot1" : "source6_imgDot2"
                  }
                />
                <span>{label}</span>
                <ApplicationNavigationAsset name="source6_imgChevronRight" />
              </a>
            ))}
          </div>
        </NavFeaturedCardGroup>
        <NavFeaturedCardActions>{link(texts[4]!)}</NavFeaturedCardActions>
      </>
    );
  else if (type === "referral")
    children = (
      <>
        <NavFeaturedCardGroup>
          <NavFeaturedCardIcon>
            <ApplicationNavigationAsset name="source6_imgLink03" />
          </NavFeaturedCardIcon>
          {text(texts[0]!, texts[1])}
        </NavFeaturedCardGroup>
        <div className="nav-featured-referral">
          <Input aria-label="Referral link" value={texts[2]} readOnly />
          <Button
            iconOnly
            aria-label="Copy referral link"
            size="md"
            variant="tertiary"
            leadingIcon={<ApplicationNavigationAsset name="source6_imgCopy01" />}
            onClick={() => onAction(`Copy ${texts[2]}`)}
          />
        </div>
      </>
    );
  else if (type === "onboarding")
    children = (
      <>
        <NavFeaturedCardGroup>
          {text(texts[0]!, undefined, undefined, texts[1])}
          <ProgressBar value={74.66} aria-label="Account setup progress" />
        </NavFeaturedCardGroup>
        <div className="nav-featured-checks">
          {texts.slice(2, 6).map((label, i) => (
            <span key={label}>
              <ApplicationNavigationAsset
                name={i < 3 ? "source6_imgTypeLineSizeXsColorPrimary" : "source6_imgCheckIcon"}
              />
              {label}
            </span>
          ))}
        </div>
        {button(texts[6]!)}
      </>
    );
  else if (type === "upgrade")
    children = (
      <>
        <NavFeaturedCardGroup>
          <NavFeaturedCardIcon>
            <ApplicationNavigationAsset name="source6_imgZapFast" />
          </NavFeaturedCardIcon>
          {text(texts[0]!, texts[2], <Badge variant="modern">{texts[1]}</Badge>)}
        </NavFeaturedCardGroup>
        {button(texts[3]!, true)}
      </>
    );
  else if (type === "support")
    children = (
      <>
        <NavFeaturedCardGroup>
          <Badge variant="modern" leading={<ApplicationNavigationAsset name="source6_imgDot3" />}>
            {texts[0]}
          </Badge>
          {text(texts[1]!, texts[2])}
        </NavFeaturedCardGroup>
        {button(
          texts[3]!,
          false,
          <ApplicationNavigationAsset name="source6_imgMessageChatCircle" />
        )}
      </>
    );
  else if (type === "event")
    children = (
      <>
        <AvatarGroup
          size="xs"
          maxVisible={4}
          totalCount={9}
          onAdd={() => onAction("Invite to workshop")}
          members={(
            [
              "source6_imgAvatar",
              "source6_imgAvatar1",
              "source6_imgAvatar2",
              "source6_imgAvatar3",
            ] as const
          ).map((name, i) => ({
            id: String(i),
            label: `Participant ${i + 1}`,
            src: applicationNavigationAssetUrl(name),
            style: {
              backgroundColor:
                source.images.find((image) => image.name === name.replace("source6_", ""))
                  ?.background ?? undefined,
            },
          }))}
        />
        <NavFeaturedCardText
          title={texts[1]}
          supportingText={texts[3]}
          badge={
            <Badge variant="modern" leading={<ApplicationNavigationAsset name="source6_imgDot3" />}>
              {texts[2]}
            </Badge>
          }
        />
        <NavFeaturedCardActions>
          {link(texts[4]!, false)}
          {link(texts[5]!)}
        </NavFeaturedCardActions>
      </>
    );
  else if (type === "message")
    children = (
      <>
        <NavFeaturedCardGroup>
          <Avatar
            label={texts[0]!}
            size="md"
            status="online"
            src={applicationNavigationAssetUrl("source6_imgAvatar4")}
          />
          <NavFeaturedCardText title={texts[0]} supportingText={texts[2]} meta={texts[1]} />
        </NavFeaturedCardGroup>
        <NavFeaturedCardActions>
          {link(texts[3]!, false)}
          {link(texts[4]!)}
        </NavFeaturedCardActions>
      </>
    );
  else if (type === "trial")
    children = (
      <>
        <NavFeaturedCardGroup>
          {text(texts[0]!, undefined, undefined, texts[1])}
          <ProgressBar value={31.62} aria-label="Free trial elapsed" />
        </NavFeaturedCardGroup>
        {button(texts[2]!)}
      </>
    );
  else
    children = (
      <>
        {text(texts[0]!, texts[1])}
        <div className="nav-featured-qr-wrap">
          <div className="nav-featured-qr">
            <ApplicationNavigationAsset name="source6_imgQrCode" />
            {[0, 1, 2, 3].map((corner) => (
              <span key={corner} data-corner={corner} />
            ))}
          </div>
          <div
            className="nav-featured-qr-scan"
            style={{ maskImage: `url(${applicationNavigationAssetUrl("source6_imgBackground1")})` }}
          />
          <ApplicationNavigationAsset className="nav-featured-qr-line" name="source6_imgLine1" />
        </div>
        {button(texts[2]!)}
      </>
    );
  return (
    <NavFeaturedCard
      type={type}
      onDismiss={
        type === "onboarding" || type === "trial"
          ? undefined
          : () => onAction(`Dismiss ${sourceType}`)
      }
    >
      {children}
    </NavFeaturedCard>
  );
}
