import { type ReactNode } from "react";
import { Avatar, AvatarProfilePhoto, Badge, Button, Input, Select, SlideoutSection } from "../src";
import {
  SlideoutAsset,
  slideoutAssetUrl,
  type SlideoutAssetName,
} from "../src/components/slideout-assets";
function asset(index: number, suffix: string): SlideoutAssetName {
  return `source${index}_img${suffix}` as SlideoutAssetName;
}

export function SlideoutProfileHeader({
  index,
  settings,
  mobile,
  onAction,
}: {
  index: number;
  settings: boolean;
  mobile: boolean;
  onAction: (value: string) => void;
}): React.ReactElement {
  const name = settings ? "Fatimah Ọ̀ṣúntókun" : "Diepreye Ọ̀rẹ̀kọ́yà";
  return (
    <div className="slideout-profile-header" data-settings={settings} data-mobile={mobile}>
      <div className="slideout-profile-banner">
        <img src={slideoutAssetUrl(asset(index, "Image"))} alt="" />
      </div>
      <div className="slideout-profile-container">
        <div className="slideout-profile-person">
          <AvatarProfilePhoto
            size="md"
            label={name}
            src={slideoutAssetUrl(asset(index, "Content"))}
            verified={!settings}
          />
          <div className="slideout-profile-copy">
            <h3>
              {name}
              {settings ? (
                <SlideoutAsset name={asset(index, "VerifiedTick")} />
              ) : (
                <span className="slideout-profile-online" aria-label="Online" />
              )}
            </h3>
            <p>{settings ? "@siennahewitt" : "chioma@PansGPT.com"}</p>
          </div>
          {settings && (
            <div className="slideout-profile-edit">
              {["Archive", "Edit01"].map((suffix, position) => (
                <Button
                  key={suffix}
                  iconOnly
                  variant="tertiary"
                  aria-label={position === 0 ? "Archive profile" : "Edit profile photo"}
                  leadingIcon={<SlideoutAsset name={asset(index, suffix)} />}
                  onClick={() => onAction(suffix)}
                />
              ))}
            </div>
          )}
        </div>
        {settings ? (
          <dl className="slideout-profile-statistics">
            {[
              ["Followers", "32,086"],
              ["Following", "4,698"],
              ["Posts", "128"],
              ["Collections", "24"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <div className="slideout-profile-tags">
              {["Design", "Product", "UI Design"].map((label) => (
                <Badge key={label} variant="modern" color="gray">
                  {label}
                </Badge>
              ))}
              <Button
                iconOnly
                variant="secondary"
                className="slideout-profile-add-label"
                aria-label="Add profile label"
                leadingIcon={<SlideoutAsset name={asset(index, "Plus")} />}
                onClick={() => onAction("Add profile label")}
              />
            </div>
            <div className="slideout-profile-actions">
              <Button
                variant="secondary"
                leadingIcon={null}
                trailingIcon={null}
                onClick={() => onAction("Add to project")}
              >
                Add to project
              </Button>
              <Button
                leadingIcon={null}
                trailingIcon={null}
                onClick={() => onAction("New project")}
              >
                New project
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function UserProfile({ index }: { index: number }): React.ReactElement {
  return (
    <>
      <SlideoutSection
        title="About"
        description={
          <>
            I’m a Designer based in Melbourne. I co-founded{" "}
            <a href="https://layers.studio">Layers Studio™</a> where we help early stage founders
            and startups take their product from 0→1.
          </>
        }
      >
        <div className="slideout-profile-contact">
          <p>
            <SlideoutAsset name={asset(index, "MarkerPin02")} />
            Melbourne, Australia
          </p>
          <a href="https://layers.studio">
            <SlideoutAsset name={asset(index, "Link01")} />
            layers.studio
          </a>
        </div>
      </SlideoutSection>
      <SlideoutSection title="Work experience">
        {[
          {
            title: "Founder",
            company: "Layers Studio™",
            date: "May 2020 – Present",
            suffix: "Avatar",
          },
          {
            title: "UX Designer",
            company: "Sisyphus",
            date: "Jan 2018 – May 2020",
            suffix: "Avatar1",
          },
          {
            title: "Visual Designer",
            company: "Catalog",
            date: "Mar 2017 – Jan 2018",
            suffix: "Avatar2",
          },
        ].map((item) => (
          <div className="slideout-work-row" key={item.title}>
            <Avatar
              size="lg"
              label={item.company}
              src={slideoutAssetUrl(asset(index, item.suffix))}
            />
            <div>
              <strong>{item.title}</strong>
              <span>{item.company}</span>
              <time>{item.date}</time>
            </div>
          </div>
        ))}
      </SlideoutSection>
    </>
  );
}
function UserSettings({ index }: { index: number }): React.ReactElement {
  return (
    <>
      <SlideoutAsset className="slideout-settings-divider" name={asset(index, "Divider1")} />
      <SlideoutSection>
        <div className="slideout-settings-name">
          <Input label="Name" required defaultValue="Sienna" aria-label="First name" />
          <Input defaultValue="Hewitt" aria-label="Last name" />
        </div>
      </SlideoutSection>
      <SlideoutAsset className="slideout-settings-divider" name={asset(index, "Divider1")} />
      <SlideoutSection>
        <Input
          label="Email"
          required
          type="email"
          defaultValue="hi@ngozi.com"
          leadingIcon={<SlideoutAsset name={asset(index, "Mail01")} />}
        />
        <p className="slideout-email-verified">
          <SlideoutAsset name={asset(index, "VerifiedTick")} />
          Verified 2 Jan, 2025
        </p>
      </SlideoutSection>
      <SlideoutAsset className="slideout-settings-divider" name={asset(index, "Divider1")} />
      <SlideoutSection>
        <Input
          label="Username"
          required
          leadingAddon="PansGPT.com/@"
          defaultValue="siennahewitt"
          trailingAction={
            <span className="slideout-username-check" aria-label="Username available">
              <SlideoutAsset name={asset(index, "HelpIcon")} />
            </span>
          }
        />
      </SlideoutSection>
      <SlideoutAsset className="slideout-settings-divider" name={asset(index, "Divider1")} />
      <SlideoutSection>
        <Select
          label="Country"
          defaultValue="au"
          leadingIcon={
            <SlideoutAsset className="slideout-country-avatar" name={asset(index, "Au")} />
          }
          trailingIcon={<SlideoutAsset name={asset(index, "ChevronDown")} />}
          options={[
            { value: "au", label: "Australia  UTC/GMT +10" },
            { value: "ng", label: "Nigeria  UTC/GMT +1" },
          ]}
          hint="Estimates based on recent IP address."
        />
      </SlideoutSection>
      <SlideoutAsset className="slideout-settings-divider" name={asset(index, "Divider1")} />
    </>
  );
}
export function SlideoutProfileContent({
  type,
  index,
}: {
  type: string;
  index: number;
}): ReactNode {
  return type === "User settings" ? <UserSettings index={index} /> : <UserProfile index={index} />;
}
