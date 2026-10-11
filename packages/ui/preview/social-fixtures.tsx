import { useState } from "react";
import {
  SocialButton,
  SocialButtonReference,
  SocialButtonGroup,
  type SocialPlatform,
  type SocialTheme,
} from "../src";
import { socialButtonSources } from "./social-source-data";
export function SocialFixtures(): React.ReactElement {
  const [chosen, setChosen] = useState<SocialPlatform>();
  return (
    <section className="preview-section">
      <h2>Social buttons</h2>
      <div className="social-source-grid">
        {socialButtonSources.map((source) => {
          const platform = /Social=(\w+)/.exec(source.name)?.[1].toLowerCase() as SocialPlatform;
          const theme = /Theme=(\w+)/.exec(source.name)?.[1].toLowerCase() as SocialTheme;
          const state = /State=(\w+)/.exec(source.name)?.[1].toLowerCase() as
            "default" | "hover" | "focused";
          return (
            <div className="social-source-cell" key={source.id}>
              <SocialButtonReference
                className="social-button-fixture"
                data-source-id={source.id}
                platform={platform}
                theme={theme}
                iconOnly={source.name.includes("False")}
                state={state}
                style={{ width: source.width }}
              />
            </div>
          );
        })}
      </div>
      <h2>Social button groups</h2>
      <div className="social-group-source-grid">
        {(["buttons", "icons"] as const).flatMap((layout) =>
          (["brand", "color", "gray"] as const).map((theme) => (
            <div className="social-group-source-scroll" key={layout + theme}>
              <SocialButtonGroup
                className="social-group-fixture"
                data-source-layout={layout}
                data-source-theme={theme}
                layout={layout}
                theme={theme}
                onSelect={setChosen}
              />
            </div>
          ))
        )}
      </div>
      <div role="group" aria-label="Interactive sign in choices" className="avatar-pattern-demo">
        <SocialButtonGroup layout="icons" onSelect={setChosen} />
        <SocialButton platform="google" disabled>
          Unavailable sign in
        </SocialButton>
        <output aria-live="polite">Selected provider: {chosen ?? "none"}</output>
      </div>
    </section>
  );
}
