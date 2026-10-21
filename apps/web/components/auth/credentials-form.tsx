"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, SocialButton } from "@pansgpt/ui/auth";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/client";
import { desktopAuth } from "@/lib/desktop-auth";
import { authMessage, safeAuthNext, signupDestination } from "@/lib/auth-navigation";
import { AuthAlert, AuthFrame, AuthStatus } from "./frame";
import { PasswordField } from "./password-field";
import { EmailSent } from "./email-sent";
type Provider = "google" | "apple";
export function CredentialsForm({ mode }: { mode: "login" | "signup" }): React.ReactElement {
  const signup = mode === "signup";
  const router = useRouter();
  const params = useSearchParams();
  const destination = signup
    ? signupDestination(params.get("invite"))
    : safeAuthNext(params.get("next"));
  const [supabase] = useState(createClient);
  const [error, setError] = useState<string | null>(() =>
    params.has("error") ? authMessage(params.get("error")) : null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const settings: unknown = await response.json();
        if (typeof settings !== "object" || !settings || !("external" in settings)) return;
        const external = settings.external;
        if (typeof external !== "object" || !external) return;
        setProviders(
          (["google", "apple"] as const).filter(
            (provider) => provider in external && Reflect.get(external, provider) === true
          )
        );
      })
      .catch(() => {
        /* Email remains available if provider settings cannot be loaded. */
      });
    return () => controller.abort();
  }, []);
  const schema = z
    .object({
      email: z.string().trim().email("Enter a valid email address."),
      password: z
        .string()
        .min(signup ? 8 : 1, signup ? "Use at least eight characters." : "Enter your password."),
      confirmPassword: z.string(),
    })
    .refine((values) => !signup || values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords must match.",
    });
  type Values = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  const callback = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
  const submit = async (values: Values): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setBusy("email");
    setError(null);
    try {
      const result = signup
        ? await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: { emailRedirectTo: callback() },
          })
        : await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });
      if (result.error) {
        setError(authMessage(result.error.code));
        return;
      }
      if (signup && !result.data.session) {
        resetField("password");
        resetField("confirmPassword");
        setEmailSent(values.email);
        return;
      }
      router.replace(destination);
      router.refresh();
    } catch {
      setError("We could not connect. Check your connection and try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };
  const oauth = async (provider: Provider): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setBusy(provider);
    setError(null);
    try {
      const native = desktopAuth();
      if (native) {
        await native.beginOAuth(provider);
        return;
      }
      const { error: failure } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback() },
      });
      if (failure) setError(authMessage("provider_error"));
    } catch {
      setError(authMessage("provider_error"));
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };
  return (
    <AuthFrame
      title={emailSent ? "Check your inbox" : signup ? "Create your account" : "Welcome back"}
      description={
        emailSent
          ? "One more step before your first study session."
          : signup
            ? "Start building your pharmacy knowledge, one session at a time."
            : "Sign in to pick up where you left off."
      }
      footer={
        !emailSent && (
          <>
            {signup ? "Already have an account? " : "New to PansGPT? "}
            <Link
              className="auth-link"
              href={
                signup
                  ? `/login?next=${encodeURIComponent(destination)}`
                  : `/signup${destination.startsWith("/onboarding?") ? `?${destination.split("?")[1]}` : ""}`
              }
            >
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </>
        )
      }
    >
      {emailSent ? (
        <EmailSent
          email={emailSent}
          resend={async () => {
            const { error: failure } = await supabase.auth.resend({
              type: "signup",
              email: emailSent,
              options: { emailRedirectTo: callback() },
            });
            return failure ? authMessage(failure.code) : null;
          }}
        />
      ) : (
        <>
          {error && <AuthAlert>{error}</AuthAlert>}
          {!signup && params.get("notice") === "password_updated" && (
            <AuthStatus>Your password has been updated. Sign in with your new password.</AuthStatus>
          )}
          {providers.length > 0 && (
            <>
              <div className="auth-social">
                {providers.map((provider) => (
                  <SocialButton
                    key={provider}
                    platform={provider}
                    theme="gray"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void oauth(provider)}
                  >
                    {busy === provider
                      ? "Connecting..."
                      : `Continue with ${provider === "google" ? "Google" : "Apple"}`}
                  </SocialButton>
                ))}
              </div>
              <div className="auth-divider">
                <span>or continue with email</span>
              </div>
            </>
          )}
          <form
            className="auth-form"
            onSubmit={(event) => {
              void handleSubmit(submit)(event);
            }}
            noValidate
            aria-busy={Boolean(busy)}
          >
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              disabled={Boolean(busy)}
              error={errors.email?.message}
              {...register("email")}
            />
            <PasswordField
              label="Password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              disabled={Boolean(busy)}
              hint={signup ? "Use at least eight characters." : undefined}
              error={errors.password?.message}
              {...register("password")}
            />
            {signup && (
              <PasswordField
                label="Confirm password"
                autoComplete="new-password"
                required
                disabled={Boolean(busy)}
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
            )}
            {!signup && (
              <Link href="/forgot-password" className="auth-link auth-forgot">
                Forgot password?
              </Link>
            )}
            <Button
              type="submit"
              leadingIcon={null}
              trailingIcon={null}
              loading={busy === "email"}
              loadingText={signup ? "Creating account..." : "Signing in..."}
              disabled={Boolean(busy)}
            >
              {signup ? "Create account" : "Sign in"}
            </Button>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
