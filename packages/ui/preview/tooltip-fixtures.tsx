import { useState } from "react";
import {
  Button,
  HelpIcon,
  HelpIconGlyph,
  HelpIconReferenceCursor,
  TooltipSurface,
  tooltipArrows,
  helpIconPlacements,
  type TooltipArrow,
  type HelpIconPlacement,
} from "../src";
export const tooltipReferenceDetail =
  "Tooltips are used to describe or identify an  element. In most scenarios, tooltips help the user understand meaning, function or alt-text.";
const helpArrows: Record<HelpIconPlacement, TooltipArrow> = {
  "top-no-arrow": "none",
  "top-arrow": "bottom-center",
  "top-left": "bottom-right",
  "top-right": "bottom-left",
  bottom: "top-center",
  left: "right",
  right: "left",
};
export function TooltipFixtures(): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <section className="preview-section" aria-labelledby="tooltip-fixtures-title">
      <h2 id="tooltip-fixtures-title">Tooltips and help icons</h2>
      <div className="tooltip-source-grid">
        {[false, true].flatMap((supporting) =>
          tooltipArrows.map((arrow) => (
            <div
              key={`${supporting}-${arrow}`}
              className="tooltip-source-fixture"
              data-arrow={arrow}
              data-supporting={supporting}
            >
              <p>
                {arrow}
                {supporting ? " / supporting text" : ""}
              </p>
              <TooltipSurface
                content="This is a tooltip"
                contentWidth={supporting ? 320 : 109}
                arrow={arrow}
                supportingText={supporting ? tooltipReferenceDetail : undefined}
              />
            </div>
          ))
        )}
      </div>
      <div className="help-source-grid">
        {[false, true].flatMap((supporting) =>
          helpIconPlacements.flatMap((placement) =>
            [false, true].map((visible) => (
              <div className="help-source-fixture" key={`${supporting}-${placement}-${visible}`}>
                <div
                  className="p-help-reference"
                  data-placement={placement}
                  data-supporting={supporting}
                  data-open={visible}
                >
                  <HelpIconGlyph open={visible} />
                  {visible && (
                    <>
                      <TooltipSurface
                        content="This is a tooltip"
                        contentWidth={supporting ? 320 : 109}
                        arrow={helpArrows[placement]}
                        supportingText={supporting ? tooltipReferenceDetail : undefined}
                      />
                      <HelpIconReferenceCursor />
                    </>
                  )}
                </div>
                <p>
                  {placement} / {visible ? "open" : "closed"}
                  {supporting ? " / supporting text" : ""}
                </p>
              </div>
            ))
          )
        )}
      </div>
      <div className="tooltip-demo" role="group" aria-label="Interactive tooltip example">
        <HelpIcon
          label="Study tips"
          content="Study tips"
          supportingText="Read the source document before starting a quiz."
          placement="top-arrow"
          delayDuration={0}
        />
        <HelpIcon label="Disabled help" content="Unavailable" disabled delayDuration={0} />
        <HelpIcon
          label="Controlled help"
          content="Controlled tooltip"
          placement="right"
          open={open}
          onOpenChange={setOpen}
          delayDuration={0}
        />
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setOpen(true)}>
          Show controlled tooltip
        </Button>
        <Button leadingIcon={null} trailingIcon={null} onClick={() => setOpen(false)}>
          Hide controlled tooltip
        </Button>
      </div>
    </section>
  );
}
