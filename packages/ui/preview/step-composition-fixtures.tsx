import { useState } from "react";
import {
  ProgressSteps,
  ProgressStepsReference,
  type ProgressStepsVariant,
  type ProgressStepsItem,
} from "../src";
import {
  StepCompositionAsset,
  type StepCompositionAssetName,
} from "../src/components/step-composition-asset";
import { stepCompositionSources } from "./step-composition-source-data";
const titles = ["Your details", "Company details", "Invite your team", "Add your socials"];
const supporting = [
  "Please provide your name and email",
  "A few details about your company",
  "Start collaborating with your team",
  "Share posts to your social accounts",
];
const shortSupporting = [
  "Name and email",
  "Website and location",
  "Start collaborating",
  "Automatic sharing",
];
const variants: Record<string, ProgressStepsVariant> = {
  "1139:79128": "minimal-connected",
  "1139:79149": "minimal",
  "1139:79465": "text-line",
  "1141:76669": "centered",
  "1254:144290": "vertical",
};
export function StepCompositionFixtures(): React.ReactElement {
  const [value, setValue] = useState("1");
  const [changes, setChanges] = useState(0);
  const liveItems: ProgressStepsItem[] = titles.map((title, index) => ({
    value: String(index),
    title,
    supportingText: supporting[index],
    disabled: index === 2,
  }));
  return (
    <>
      <h2>Composed progress steps</h2>
      <div className="step-composition-source-grid">
        {stepCompositionSources.map((source) => {
          const size = source.name.includes("Size=md") ? "md" : "sm";
          const marker = source.name.includes("Type=Number")
            ? "number"
            : source.name.includes("Featured") || source.name.includes("featured")
              ? "featured"
              : "check";
          const centered = source.family === "1141:76669";
          const items: ProgressStepsItem[] = titles.map((title, index) => {
            const desktopKey =
              index === 1
                ? size === "sm"
                  ? "imgFlag05"
                  : "imgFlag6"
                : index === 2
                  ? size === "sm"
                    ? "imgUsersPlus"
                    : "imgUsersPlus1"
                  : size === "sm"
                    ? "imgStars02"
                    : "imgStars3";
            const mobileKey =
              index === 1 ? "imgFlag6" : index === 2 ? "imgUsersPlus1" : "imgStars3";
            const verticalKey =
              index === 1 ? "imgFlag05" : index === 2 ? "imgUsersPlus" : "imgStars02";
            return {
              value: String(index),
              title,
              supportingText: centered ? shortSupporting[index] : supporting[index],
              mobileSupportingText: supporting[index],
              icon:
                marker === "featured" && index > 0 ? (
                  <StepCompositionAsset
                    name={
                      `${centered ? "1141-76669" : "1254-144290"}_${centered ? desktopKey : verticalKey}` as StepCompositionAssetName
                    }
                  />
                ) : undefined,
              mobileIcon:
                marker === "featured" && index > 0 ? (
                  <StepCompositionAsset
                    name={
                      `${centered ? "1141-76669" : "1254-144290"}_${centered ? mobileKey : verticalKey}` as StepCompositionAssetName
                    }
                  />
                ) : undefined,
            };
          });
          return (
            <div className="step-composition-source-scroll" key={source.id}>
              <ProgressStepsReference
                items={items}
                label="Source progress steps"
                variant={variants[source.family]}
                marker={marker}
                size={size}
                defaultValue={
                  source.family === "1141:76669" || source.family === "1139:79465" ? "1" : "2"
                }
                breakpoint={source.name.includes("Mobile") ? "mobile" : "desktop"}
                className="step-composition-fixture"
                data-source-id={source.id}
                data-source-family={source.family}
                style={{ width: source.width }}
              />
            </div>
          );
        })}
      </div>
      <div role="group" aria-label="Interactive progress steps" className="avatar-pattern-demo">
        <ProgressSteps
          label="Setup flow"
          items={liveItems}
          variant="text-line"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setChanges((previous) => previous + 1);
          }}
        />
        <output aria-live="polite">
          Selected step: {value}; changes: {changes}
        </output>
        <ProgressSteps
          label="Uncontrolled setup flow"
          items={liveItems}
          variant="minimal"
          marker="number"
          interactive
          defaultValue="0"
        />
        <ProgressSteps
          label="Hidden-counter progress"
          items={liveItems}
          variant="minimal"
          showCounter={false}
          defaultValue="1"
        />
        <ProgressSteps
          label="Centered live progress"
          items={liveItems}
          variant="centered"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setChanges((previous) => previous + 1);
          }}
        />
        <ProgressSteps
          label="Three-step centered progress"
          items={liveItems.slice(0, 3)}
          variant="centered"
          defaultValue="1"
        />
        <ProgressSteps
          label="Three-step connected progress"
          items={liveItems.slice(0, 3)}
          variant="minimal-connected"
          defaultValue="1"
        />
      </div>
    </>
  );
}
