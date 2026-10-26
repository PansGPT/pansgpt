"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@pansgpt/ui/auth";
import { createClient } from "@/lib/supabase/client";
import { authMessage } from "@/lib/auth-navigation";
import { AuthAlert, AuthFrame } from "./frame";
import { EmailSent } from "./email-sent";
const schema = z.object({ email: z.string().trim().email("Enter a valid email address.") });
export function ForgotPasswordForm(): React.ReactElement {
  const params = useSearchParams();
  const [supabase] = useState(createClient);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() =>
    params.has("error") ? authMessage(params.get("error")) : null
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const send = async (address: string): Promise<string | null> => {
    const { error: failure } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    return failure ? authMessage(failure.code) : null;
  };
  return (
    <AuthFrame
      title={email ? "Check your inbox" : "Forgot your password?"}
      description="We will help you get back to your study space."
      footer={
        !email && (
          <Link className="auth-link" href="/login">
            Back to sign in
          </Link>
        )
      }
    >
      {email ? (
        <EmailSent email={email} recovery resend={() => send(email)} />
      ) : (
        <form
          className="auth-form"
          noValidate
          aria-busy={busy}
          onSubmit={(event) => {
            void handleSubmit(async (values) => {
              if (pending.current) return;
              pending.current = true;
              setBusy(true);
              setError(null);
              try {
                const message = await send(values.email);
                if (message) setError(message);
                else setEmail(values.email);
              } catch {
                setError("We could not connect. Check your connection and try again.");
              } finally {
                pending.current = false;
                setBusy(false);
              }
            })(event);
          }}
        >
          {error && <AuthAlert>{error}</AuthAlert>}
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            disabled={busy}
            error={errors.email?.message}
            {...register("email")}
          />
          <Button
            type="submit"
            loading={busy}
            disabled={busy}
            loadingText="Requesting link..."
            leadingIcon={null}
            trailingIcon={null}
          >
            Send reset link
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
