import { Suspense } from "react";
import { ConfiguredCredentials } from "@/components/auth/configured-credentials";
import { AuthLoading } from "@/components/auth/loading";
export default function Page(): React.ReactElement {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ConfiguredCredentials mode="login" />
    </Suspense>
  );
}
