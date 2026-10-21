"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@pansgpt/ui/auth";
import { AuthAlert, AuthStatus } from "./frame";
export function EmailSent({
  email,
  recovery,
  resend,
}: {
  email: string;
  recovery?: boolean;
  resend: () => Promise<string | null>;
}): React.ReactElement {
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!seconds) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  return (
    <div className="auth-form">
      <AuthStatus>
        {recovery ? "If an account exists for " : "Check "}
        <strong>{email}</strong>
        {recovery
          ? ", we will send a password reset link."
          : " for a confirmation link before signing in."}
      </AuthStatus>
      <p className="auth-help">
        Open the link in this browser. Check your spam folder if it does not arrive.
      </p>
      {error && <AuthAlert>{error}</AuthAlert>}
      <Button
        variant="secondary"
        leadingIcon={null}
        trailingIcon={null}
        disabled={seconds > 0 || busy}
        loading={busy}
        onClick={async () => {
          if (busy || seconds) return;
          setBusy(true);
          setError(null);
          try {
            const message = await resend();
            setError(message);
            if (!message) setSeconds(60);
          } catch {
            setError("The email could not be requested. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {seconds ? `Resend email in ${seconds}s` : "Resend email"}
      </Button>
      <Link className="auth-link auth-centered" href="/login">
        Back to sign in
      </Link>
    </div>
  );
}
