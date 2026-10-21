import { Suspense } from "react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { AuthLoading } from "@/components/auth/loading";
export default function OnboardingPage(): React.ReactElement {
  return (
    <Suspense fallback={<AuthLoading />}>
      <OnboardingForm />
    </Suspense>
  );
}
