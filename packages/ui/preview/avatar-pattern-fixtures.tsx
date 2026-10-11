import { useState } from "react";
import {
  AvatarGroup,
  AvatarAddButton,
  AvatarAddButtonReference,
  AvatarLabelGroup,
  AvatarProfilePhoto,
  AvatarImage,
  avatarProfileSizes,
  avatarGroupSizes,
  type AvatarGroupMember,
  type AvatarStatus,
  type AvatarSize,
} from "../src";
import {
  avatarPatternAssetUrl,
  type AvatarPatternAssetName,
} from "../src/components/avatar-pattern-assets";
const portraitNames = [
  "Olivia Rhye",
  "Phoenix Baker",
  "Lana Steiner",
  "Demi Wilkinson",
  "Candice Wu",
  "Natali Craig",
  "Drew Cano",
  "Orlando Diggs",
  "Andi Lane",
  "Kate Morrison",
];
const members: AvatarGroupMember[] = portraitNames.map((label, index) => ({
  id: `user-${index}`,
  label,
  src: avatarPatternAssetUrl(("avatargroup_imgAvatar" + (index || "")) as AvatarPatternAssetName),
}));
const statusValues: AvatarStatus[] = ["none", "online", "company", "verified"];
const sizes: Extract<AvatarSize, "sm" | "md" | "lg" | "xl">[] = ["sm", "md", "lg", "xl"];
const verified: Record<(typeof sizes)[number], AvatarPatternAssetName> = {
  sm: "avatarlabel_imgSizeSm",
  md: "avatarlabel_imgSizeMd",
  lg: "avatarlabel_imgSizeLg",
  xl: "avatarlabel_imgSizeXl",
};
const photo = avatarPatternAssetUrl(
  "avatarlabel_imgSizeXlPlaceholderFalseTextFalseStatusIconCompany"
);
export function AvatarPatternFixtures(): React.ReactElement {
  const [count, setCount] = useState(3);
  const [moreClicks, setMoreClicks] = useState(0);
  const [profileSrc, setProfileSrc] = useState(photo);
  const [profileVerified, setProfileVerified] = useState(true);
  return (
    <section className="preview-section" aria-labelledby="avatar-pattern-title">
      <h2 id="avatar-pattern-title">Avatar groups and labels</h2>
      <div className="avatar-group-source-grid">
        {avatarGroupSizes.map((size) => (
          <div className="avatar-pattern-source-scroll" key={size}>
            <p>{size} / avatar group</p>
            <AvatarGroup
              className="avatar-group-fixture"
              members={members}
              totalCount={15}
              size={size}
              onAdd={() => {}}
            />
          </div>
        ))}
      </div>
      <div className="avatar-add-source-grid">
        {avatarGroupSizes.flatMap((size) =>
          (["default", "hover", "focus", "disabled"] as const).map((state) => (
            <div
              className="avatar-add-fixture"
              data-size={size}
              data-state={state}
              key={size + state}
            >
              <p>
                {size} / {state}
              </p>
              <AvatarAddButtonReference size={size} state={state} />
            </div>
          ))
        )}
      </div>
      <div className="avatar-label-source-grid">
        {sizes.flatMap((size) =>
          statusValues.map((status) => (
            <div className="avatar-pattern-source-scroll" key={size + status}>
              <p>
                {size} / {status}
              </p>
              <AvatarLabelGroup
                className="avatar-label-fixture"
                size={size}
                data-status={status}
                name="Diepreye Ọ̀rẹ̀kọ́yà"
                supportingText="chioma@PansGPT.com"
                avatar={{
                  label: "Diepreye Ọ̀rẹ̀kọ́yà",
                  src: photo,
                  status,
                  companySrc: avatarPatternAssetUrl("avatarlabel_imgSizeSm1"),
                  verifiedSrc: avatarPatternAssetUrl(verified[size]),
                }}
              />
            </div>
          ))
        )}
      </div>
      <div className="avatar-profile-source-grid">
        {avatarProfileSizes.flatMap((size) =>
          (["photo", "placeholder", "initials"] as const).map((mode) => (
            <div
              className="avatar-profile-fixture"
              data-size={size}
              data-mode={mode}
              key={size + mode}
            >
              <p>
                {size} / {mode}
              </p>
              <AvatarProfilePhoto
                size={size}
                label="Profile source"
                src={avatarPatternAssetUrl("avatarprofile_imgContent")}
                placeholder={mode === "placeholder"}
                initials={mode === "initials" ? "OR" : undefined}
                verified
              />
            </div>
          ))
        )}
      </div>
      <div role="group" aria-label="Interactive profile photo" className="avatar-pattern-demo">
        {(["square", "portrait"] as const).map((variant) => (
          <AvatarImage
            key={variant}
            className="avatar-image-fixture"
            variant={variant}
            src={avatarPatternAssetUrl(
              variant === "square" ? "avatarimage_imgImage" : "avatarimage_imgImage1"
            )}
            alt={variant === "square" ? "Diepreye Ọ̀rẹ̀kọ́yà" : "Àrìnọlá Okafor"}
            caption={variant === "square" ? "Diepreye Ọ̀rẹ̀kọ́yà" : "Àrìnọlá Okafor"}
            source={{ label: "Source" }}
          />
        ))}
        <AvatarProfilePhoto
          label="Student profile"
          src={profileSrc}
          size="md"
          verified={profileVerified}
        />
        <div className="code-demo-actions">
          <AvatarAddButton
            aria-label="Use unavailable profile image"
            onClick={() => setProfileSrc("/missing-profile.png")}
          />
          <AvatarAddButton
            aria-label="Restore profile image"
            onClick={() => setProfileSrc(photo)}
          />
          <AvatarAddButton
            aria-label="Toggle profile verification"
            onClick={() => setProfileVerified(!profileVerified)}
          />
        </div>
      </div>
      <div role="group" aria-label="Interactive avatar group" className="avatar-pattern-demo">
        <AvatarGroup
          members={members.slice(0, count)}
          size="md"
          maxVisible={2}
          totalCount={count}
          onAdd={() => setCount(Math.min(members.length, count + 1))}
          onMoreClick={() => setMoreClicks(moreClicks + 1)}
          aria-label="Study group members"
        />
        <output aria-live="polite">
          Members: {count}; more actions: {moreClicks}
        </output>
        <AvatarAddButton disabled aria-label="Unavailable add action" />
        <AvatarLabelGroup
          name="Research student with a long display name"
          supportingText={<a href="mailto:student@example.com">student@example.com</a>}
          avatar={{ label: "Research student", src: photo, status: "online" }}
        />
      </div>
    </section>
  );
}
