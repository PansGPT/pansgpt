import { StepIcon, ProgressStep, type ProgressStepVariant, type StepStatus } from "../src";
import { stepIconSources, stepBaseSources } from "./step-source-data";
import { StepCompositionFixtures } from "./step-composition-fixtures";
const variants: Record<string, ProgressStepVariant> = {
  "Icon left": "icon-left",
  "Icon top": "icon-top",
  "Number left": "number-left",
  "Number top": "number-top",
  "Featured icon left": "featured-icon-left",
  "Featured icon top": "featured-icon-top",
  "Text line": "text-line",
};
export function StepFixtures(): React.ReactElement {
  return (
    <section className="preview-section">
      <h2>Progress step icons</h2>
      <div className="step-icon-source-grid">
        {stepIconSources.map((source) => (
          <StepIcon
            key={source.id}
            data-source-id={source.id}
            size={source.name.includes("Size=md") ? "md" : "sm"}
            status={/Status=(\w+)/.exec(source.name)?.[1].toLowerCase() as StepStatus}
            variant={source.name.includes("Type=Number") ? "number" : "check"}
          />
        ))}
      </div>
      <h2>Progress step layouts</h2>
      <div className="step-base-source-grid">
        {stepBaseSources.map((source) => (
          <ProgressStep
            key={source.id}
            data-source-id={source.id}
            title="Your details"
            supportingText="Please provide your name and email"
            variant={variants[/Type=([^,]+)/.exec(source.name)?.[1] ?? ""]}
            size={source.name.includes("Size=md") ? "md" : "sm"}
            status={/Status=(\w+)/.exec(source.name)?.[1].toLowerCase() as StepStatus}
          />
        ))}
      </div>
      <StepCompositionFixtures />
      <p>
        Step icons are decorative inside a labelled step, or expose a caller-supplied accessible
        image label.
      </p>
      <StepIcon
        variant="number"
        number={12}
        status="current"
        size="md"
        aria-label="Current step 12"
      />
    </section>
  );
}
