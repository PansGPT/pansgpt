import { useState } from "react";
import {
  CloseButton,
  CloseButtonReference,
  UtilityButton,
  UtilityButtonReference,
  AppStoreBadge,
  appStores,
} from "../src";
export function CloseButtonFixtures(): React.ReactElement {
  const [clicks, setClicks] = useState(0);
  return (
    <section className="preview-section">
      <h2>Close buttons</h2>
      <div className="close-button-source-grid">
        {([false, true] as const).flatMap((darkBackground) =>
          (["sm", "md", "lg"] as const).flatMap((size) =>
            (["default", "hover", "focused"] as const).map((state) => (
              <div
                className="close-button-fixture"
                data-dark={darkBackground}
                data-size={size}
                data-state={state}
                key={`${darkBackground}-${size}-${state}`}
              >
                <CloseButtonReference
                  aria-label={`${size} ${state} close`}
                  size={size}
                  darkBackground={darkBackground}
                  state={state}
                />
              </div>
            ))
          )
        )}
      </div>
      <div role="group" aria-label="Interactive close buttons" className="avatar-pattern-demo">
        <CloseButton aria-label="Dismiss sample" onClick={() => setClicks(clicks + 1)} />
        <CloseButton
          aria-label="Unavailable dismiss"
          disabled
          onClick={() => setClicks(clicks + 1)}
        />
        <output aria-live="polite">Dismiss actions: {clicks}</output>
      </div>
      <h2>Utility buttons</h2>
      <h2>App store badges</h2>
      <div className="app-store-source-grid">
        {appStores.flatMap((store) =>
          (["brand", "outline"] as const).flatMap((variant) =>
            (["md", "lg"] as const).map((size) => (
              <AppStoreBadge
                className="app-store-fixture"
                key={store + variant + size}
                store={store}
                variant={variant}
                size={size}
              />
            ))
          )
        )}
      </div>
      <AppStoreBadge href="#app-store-demo" aria-label="Inspect app-store example" />
      <p id="app-store-demo">
        Local preview link target; product callers supply their own store listings.
      </p>
      <div className="utility-button-source-grid">
        {(["xs", "sm"] as const).flatMap((size) =>
          (["secondary", "tertiary"] as const).flatMap((variant) =>
            (["default", "hover", "focused", "disabled"] as const).map((state) => (
              <div
                className="utility-button-fixture"
                data-size={size}
                data-variant={variant}
                data-state={state}
                key={size + variant + state}
              >
                <UtilityButtonReference
                  aria-label="Utility source"
                  size={size}
                  variant={variant}
                  state={state}
                />
              </div>
            ))
          )
        )}
      </div>
      <div role="group" aria-label="Interactive utility buttons" className="avatar-pattern-demo">
        <UtilityButton
          aria-label="Utility action"
          tooltip="Utility action"
          onClick={() => setClicks(clicks + 1)}
        />
        <UtilityButton aria-label="Unavailable utility action" disabled />
        <output aria-live="polite">Utility actions: {clicks}</output>
      </div>
    </section>
  );
}
