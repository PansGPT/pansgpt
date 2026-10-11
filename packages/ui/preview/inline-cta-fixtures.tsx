import { useState } from "react";
import {
  Button,
  InlineCTA,
  InlineCTAActions,
  InlineCTAEmailCapture,
  InlineCTAFeatures,
  InlineCTAPaymentMethod,
  InlineCTAPlan,
  InlineCTAReceipt,
  type InlineCTAType,
} from "../src";
import { inlineCTAAssetUrl } from "../src/components/inline-cta-assets";

import { inlineCTASources } from "./inline-cta-source-data";
const copy: Record<InlineCTAType, readonly [string, string]> = {
  image: [
    "We’ve just released a new update!",
    "Check out the all new dashboard view. Pages and now load faster.",
  ],
  actions: [
    "We’ve just released a new update!",
    "Check out the all new dashboard view. Pages and now load faster.",
  ],
  email: [
    "We’ve just released a new update!",
    "Check out the all new dashboard view. Pages and now load faster.",
  ],
  "change-plan": ["Change your plan", "Flexible pricing that grows with you."],
  "upgrade-plan": ["Upgrade your plan", "Need more space? Upgrade your plan today."],
  payment: ["Payment method", "Change how you pay for your plan."],
  receipt: ["Your latest receipt is available", "Download receipt for January 2025."],
};
const features = [
  { id: "users", title: "10 users", supportingText: "Add up to 10 team members." },
  { id: "data", title: "20 GB data", supportingText: "Up to 20 GB individual data." },
  {
    id: "features",
    title: "All features",
    supportingText: "Access to advanced features and analytics.",
  },
];
export function InlineCTAFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const button = (label: string, secondary = false): React.ReactElement => (
    <Button
      size="md"
      variant={secondary ? "secondary" : "primary"}
      leadingIcon={null}
      trailingIcon={null}
      onClick={() => setAction(label)}
    >
      {label}
    </Button>
  );
  const actions = (secondary: string, primary: string): React.ReactElement => (
    <InlineCTAActions secondary={button(secondary, true)} primary={button(primary)} />
  );
  return (
    <section className="preview-section">
      <h2>All fourteen inline CTA layouts</h2>
      <div className="inline-cta-source-scroll">
        <div className="inline-cta-source-grid">
          {inlineCTASources.map(([id, type, breakpoint]) => (
            <InlineCTA
              key={id}
              data-cta-source-id={id}
              type={type}
              breakpoint={breakpoint}
              title={copy[type][0]}
              supportingText={copy[type][1]}
              image={
                type === "image" ? (
                  <img src={inlineCTAAssetUrl("imgImage")} alt="Presenter introducing the update" />
                ) : undefined
              }
              actions={
                type === "image" || type === "actions"
                  ? actions("Dismiss", "Changelog")
                  : type === "upgrade-plan"
                    ? actions("All plans", "Upgrade plan")
                    : undefined
              }
            >
              {type === "email" && (
                <InlineCTAEmailCapture
                  placeholder="you@PansGPT.com"
                  onSubscribe={(value) => setAction(`Subscribed: ${value}`)}
                />
              )}
              {type === "change-plan" && (
                <InlineCTAPlan
                  label="Basic plan"
                  price="$10"
                  period="per month"
                  supportingText="Includes up to 10 users, 20 GB individual data and access to all features."
                  actions={actions("Learn more", "Upgrade plan")}
                />
              )}
              {type === "upgrade-plan" && <InlineCTAFeatures items={features} />}
              {type === "payment" && (
                <InlineCTAPaymentMethod
                  title="Visa ending in 1234"
                  expiry="Expiry 06/2025"
                  billingEmail="billing@PansGPT.com"
                  action={button("Edit", true)}
                />
              )}
              {type === "receipt" && (
                <InlineCTAReceipt
                  fileName="Receipt_January_2025.pdf"
                  sizeLabel="200 KB"
                  actions={actions("Download", "View")}
                />
              )}
            </InlineCTA>
          ))}
        </div>
      </div>
      <h2>Live responsive email capture</h2>
      <div className="preview-controls">
        <label>
          <input
            type="checkbox"
            checked={pending}
            onChange={(event) => setPending(event.target.checked)}
          />{" "}
          Pending subscription
        </label>
        <label>
          <input
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />{" "}
          Disable subscription
        </label>
        <Button
          variant="secondary"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setVisible(true)}
        >
          Show update
        </Button>
      </div>
      {visible && (
        <InlineCTA
          data-testid="live-inline-cta"
          type="email"
          title="Keep learning with PansGPT"
          supportingText="Receive product updates."
          actions={
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => setVisible(false)}
            >
              Dismiss update
            </Button>
          }
        >
          <InlineCTAEmailCapture
            email={email}
            onEmailChange={setEmail}
            pending={pending}
            disabled={disabled}
            onSubscribe={(value) => setAction(`Subscribed: ${value}`)}
          />
        </InlineCTA>
      )}
      <output className="inline-cta-output" data-testid="inline-cta-action">
        {action}
      </output>
      <output className="inline-cta-output" data-testid="inline-cta-email">
        {email}
      </output>
    </section>
  );
}
