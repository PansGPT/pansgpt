import { useState } from "react";
import {
  Button,
  VerificationCodeInput,
  VerificationCodeSlot,
  verificationCodeSizes,
  type VerificationCodeSlotState,
} from "../src";
export function CodeFixtures(): React.ReactElement {
  const [value, setValue] = useState("");
  const [complete, setComplete] = useState("");
  const [error, setError] = useState(false);
  return (
    <section className="preview-section" aria-labelledby="code-fixtures-title">
      <h2 id="code-fixtures-title">Verification code inputs</h2>
      <div className="code-source-grid">
        {verificationCodeSizes.flatMap((size) =>
          ([4, 6] as const).map((digits) => (
            <div className="code-source-scroll" key={size + digits}>
              <p>
                {size} / {digits} digits
              </p>
              <VerificationCodeInput
                className="code-source-fixture"
                size={size}
                digits={digits}
                label="Secure code"
                hint="This is a hint text to help user."
                responsive={false}
              />
            </div>
          ))
        )}
      </div>
      <div className="code-slot-grid">
        {verificationCodeSizes.flatMap((size) =>
          (["placeholder", "filled", "focused", "disabled"] as VerificationCodeSlotState[]).map(
            (state) => (
              <div
                className="code-slot-fixture"
                data-size={size}
                data-state={state}
                key={size + state}
              >
                <p>
                  {size} / {state}
                </p>
                <VerificationCodeSlot size={size} state={state} />
              </div>
            )
          )
        )}
      </div>
      <div className="code-option-grid">
        {([true, false] as const).flatMap((showLabel) =>
          ([true, false] as const).map((showHint) => (
            <VerificationCodeInput
              key={`${showLabel}${showHint}`}
              className="code-option-fixture"
              digits={4}
              label={showLabel ? "Optional label" : undefined}
              hint={showHint ? "Optional hint" : undefined}
              aria-label="Optional code"
            />
          ))
        )}
      </div>
      <form
        aria-label="Verification example"
        className="code-live-demo"
        onSubmit={(e) => e.preventDefault()}
      >
        <VerificationCodeInput
          name="code"
          label="Study access code"
          hint="Enter the six-digit code."
          error={error ? "The code has expired." : undefined}
          size="md"
          digits={6}
          value={value}
          onValueChange={setValue}
          onComplete={setComplete}
          required
        />
        <output aria-live="polite">
          Code: {value || "empty"}; completed: {complete || "none"}
        </output>
        <div className="code-demo-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setValue("");
              setComplete("");
            }}
          >
            Clear code
          </Button>
          <Button type="button" variant="secondary" onClick={() => setError(!error)}>
            Toggle code error
          </Button>
        </div>
        <VerificationCodeInput label="Disabled code" defaultValue="1234" disabled />
        <VerificationCodeInput label="Read-only code" defaultValue="5678" readOnly />
        <VerificationCodeInput label="Uncontrolled code" name="secondary" defaultValue="" />
      </form>
    </section>
  );
}
