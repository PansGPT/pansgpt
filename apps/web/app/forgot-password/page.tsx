import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthLoading } from "@/components/auth/loading";
export default function Page(): React.ReactElement {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
