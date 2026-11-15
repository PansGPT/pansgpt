import React from "react";
import { createRoot } from "react-dom/client";
import "@pansgpt/ui/styles.css";
import "@/components/governance/governance.css";
import { GovernancePreview } from "@/components/governance/preview";
import { GovernanceWorkspace } from "@/components/governance/workspace";
import { createGovernanceApi } from "@/lib/governance-api";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import "@/components/auth/auth.css";
const integration = new URLSearchParams(location.search).get("integration") === "1";
const integrationToken = integration
  ? await fetch("/__governance-test/token")
      .then((response) => response.json())
      .then((data) => data.token)
  : null;
const integrationAdapter = integrationToken ? createGovernanceApi(integrationToken) : null;
function IntegrationWorkspace() {
  const path = usePathname();
  return (
    <GovernanceWorkspace adapter={integrationAdapter} section={path.split("/")[2] || "overview"} />
  );
}
const networkTest = new URLSearchParams(location.search).get("transport") === "network-test";
const onboarding = new URLSearchParams(location.search).get("onboarding") === "1";
function OnboardingWorkspace() {
  const path = usePathname();
  const { session } = useAuth();
  const adapter = React.useMemo(
    () => (session ? createGovernanceApi(session.access_token) : null),
    [session]
  );
  return path === "/onboarding" ? (
    <OnboardingForm />
  ) : adapter ? (
    <GovernanceWorkspace adapter={adapter} section={path.split("/")[2] || "overview"} />
  ) : (
    <p>Sign in to continue.</p>
  );
}
createRoot(document.getElementById("root")).render(
  onboarding ? (
    <OnboardingWorkspace />
  ) : integration ? (
    <IntegrationWorkspace />
  ) : networkTest ? (
    <GovernanceWorkspace
      adapter={createGovernanceApi("synthetic-test-token")}
      section="materials"
    />
  ) : (
    <GovernancePreview />
  )
);
