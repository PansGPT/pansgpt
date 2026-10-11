import { useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "../src";
import { buttonSources } from "./button-source-data";
const variants: Record<string, ButtonVariant> = {
  Primary: "primary",
  Secondary: "secondary",
  Tertiary: "tertiary",
  "Link color": "link-color",
  "Link gray": "link-gray",
  Link: "link-color",
};
export function ButtonFixtures(): React.ReactElement {
  const [clicks, setClicks] = useState(0);
  return (
    <section className="preview-section">
      <h2>Complete button library</h2>
      <div className="button-library-grid">
        {buttonSources.map((source) => {
          const props = Object.fromEntries(source.name.split(", ").map((pair) => pair.split("=")));
          const shared = {
            size: props.Size as ButtonSize,
            variant: variants[props.Hierarchy],
            destructive: source.familyId === "6218:85578",
            disabled: props.State === "Disabled",
            loading: props.State === "Loading",
            loadingText: "Submitting...",
            "data-reference-state": props.State.toLowerCase(),
            onClick: () => setClicks((v) => v + 1),
          };
          return (
            <div key={source.id} data-button-source-id={source.id}>
              {props["Icon only"] === "True" ? (
                <Button {...shared} iconOnly aria-label={`Action ${source.id}`} />
              ) : (
                <Button {...shared}>Button CTA</Button>
              )}
            </div>
          );
        })}
      </div>
      <div data-testid="live-button-states">
        <Button onClick={() => setClicks((v) => v + 1)}>Continue</Button>
        <Button variant="secondary" onClick={() => setClicks((v) => v + 1)}>
          Save draft
        </Button>
        <Button destructive onClick={() => setClicks((v) => v + 1)}>
          Delete
        </Button>
        <Button loading loadingText="Saving">
          Save
        </Button>
      </div>
      <output data-testid="button-clicks">{clicks}</output>
    </section>
  );
}
