import { useState } from "react";
import { Button, ButtonGroup, ButtonGroupButton, SectionFooter } from "../src";
import plus from "../assets/section-footer-plus.svg";

const sources = [
  ["3275:372565", "section", true, "desktop"],
  ["3275:372639", "section", true, "mobile"],
  ["3275:373080", "section", false, "desktop"],
  ["3275:373087", "section", false, "mobile"],
  ["3275:372530", "card", true, "desktop"],
  ["3275:372632", "card", true, "mobile"],
  ["3275:373066", "card", false, "desktop"],
  ["3275:373073", "card", false, "mobile"],
] as const;
function RangeControl({
  compact,
  value,
  onValueChange,
}: {
  compact: boolean;
  value: string;
  onValueChange: (value: string) => void;
}): React.ReactElement {
  const icon = <img src={typeof plus === "string" ? plus : plus.src} alt="" />;
  return (
    <ButtonGroup label="Reporting period">
      {[
        ["12m", "12 months"],
        ["30d", "30 days"],
        ["7d", "7 days"],
      ].map(([short, long]) => (
        <ButtonGroupButton
          key={short}
          current={value === short}
          onClick={() => onValueChange(short)}
        >
          {compact ? short : long}
        </ButtonGroupButton>
      ))}
      {compact ? (
        <ButtonGroupButton
          kind="icon"
          aria-label="Custom period"
          icon={icon}
          current={value === "custom"}
          onClick={() => onValueChange("custom")}
        />
      ) : (
        <ButtonGroupButton
          kind="leading"
          icon={icon}
          current={value === "custom"}
          onClick={() => onValueChange("custom")}
        >
          Custom
        </ButtonGroupButton>
      )}
    </ButtonGroup>
  );
}
export function SectionFooterFixtures(): React.ReactElement {
  const [period, setPeriod] = useState("12m");
  const [action, setAction] = useState("");
  const actions = (
    <>
      {(["tertiary", "secondary", "primary"] as const).map((variant) => (
        <Button
          key={variant}
          size="md"
          variant={variant}
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setAction(variant)}
        >
          {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </>
  );
  const secondary = (
    <Button
      variant="link-gray"
      leadingIcon={null}
      trailingIcon={null}
      onClick={() => setAction("Learn more")}
    >
      Learn more
    </Button>
  );
  const controls = {
    control: <RangeControl compact={false} value={period} onValueChange={setPeriod} />,
    mobileControl: <RangeControl compact value={period} onValueChange={setPeriod} />,
  };
  return (
    <section className="preview-section">
      <h2>Section footer source layouts</h2>
      <div className="section-header-source-scroll">
        <div className="section-footer-source-grid">
          {sources.map(([id, variant, group, breakpoint]) => (
            <SectionFooter
              key={id}
              data-source-id={id}
              variant={variant}
              breakpoint={breakpoint}
              {...(group ? controls : {})}
              secondaryAction={secondary}
              actions={actions}
            />
          ))}
        </div>
      </div>
      <h2>Responsive live footer</h2>
      <SectionFooter
        data-testid="footer-live"
        variant="card"
        {...controls}
        secondaryAction={secondary}
        actions={actions}
      />
      <output data-testid="footer-period">{period}</output>
      <output data-testid="footer-action" aria-live="polite">
        {action}
      </output>
      <SectionFooter data-testid="footer-empty" divider={false} />
    </section>
  );
}
