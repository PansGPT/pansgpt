import { Suspense } from "react";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { AuthLoading } from "@/components/auth/loading";
export default function Page(): React.ReactElement {
  return (
    <Suspense fallback={<AuthLoading />}>
      <CredentialsForm mode="signup" />
    </Suspense>
  );
}
