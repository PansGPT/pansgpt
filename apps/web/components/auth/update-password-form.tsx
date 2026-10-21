"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@pansgpt/ui/auth";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-navigation";
import { AuthAlert, AuthFrame, AuthStatus } from "./frame";
import { PasswordField } from "./password-field";
const schema = z
  .object({
    password: z.string().min(8, "Use at least eight characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });
export function UpdatePasswordForm(): React.ReactElement {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const finish = async (): Promise<void> => {
    const { error: failure } = await supabase.auth.signOut({ scope: "global" });
    if (failure) {
      setError(
        "Your password was changed, but we could not finish signing out. Retry to sign in again."
      );
      return;
    }
    router.replace("/login?notice=password_updated");
    router.refresh();
  };
  return (
    <AuthFrame title="Choose a new password" description="Make it unique to your PansGPT account.">
      <form
        className="auth-form"
        noValidate
        aria-busy={busy}
        onSubmit={(event) => {
          void handleSubmit(async (values) => {
            if (pending.current || updated) return;
            pending.current = true;
            setBusy(true);
            setError(null);
            try {
              const { error: failure } = await supabase.auth.updateUser({
                password: values.password,
              });
              if (failure) {
                setError(authMessage(failure.code));
                return;
              }
              reset();
              setUpdated(true);
              await finish();
            } catch {
              setError("We could not complete the request. Check your connection and try again.");
            } finally {
              pending.current = false;
              setBusy(false);
            }
          })(event);
        }}
      >
        {error && <AuthAlert>{error}</AuthAlert>}
        {updated ? (
          <>
            <AuthStatus>Your password has been changed.</AuthStatus>
            <Button
              type="button"
              disabled={busy}
              leadingIcon={null}
              trailingIcon={null}
              onClick={async () => {
                setBusy(true);
                try {
                  await finish();
                } catch {
                  setError("We could not sign out. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Finish signing out
            </Button>
          </>
        ) : (
          <>
            <PasswordField
              label="New password"
              autoComplete="new-password"
              required
              disabled={busy}
              hint="Use at least eight characters."
              error={errors.password?.message}
              {...register("password")}
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              required
              disabled={busy}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button
              type="submit"
              loading={busy}
              disabled={busy}
              loadingText="Updating password..."
              leadingIcon={null}
              trailingIcon={null}
            >
              Update password
            </Button>
          </>
        )}
      </form>
    </AuthFrame>
  );
}
