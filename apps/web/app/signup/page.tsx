"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, AlertCircle, CheckCircle2, Mail, Loader2, Eye, EyeOff } from "lucide-react";

const signupSchema = z
  .object({
    email: z.string().email("Please enter a valid academic email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupFormContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [authError, setAuthError] = useState<string | null>(
    urlError ? decodeURIComponent(urlError) : null
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (urlError) {
      setAuthError(decodeURIComponent(urlError));
    }
  }, [urlError]);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setLoading(true);
    setAuthError(null);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setRegisteredEmail(values.email);
      setIsSuccess(true);
    } catch {
      setAuthError("An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    setAuthError(null);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        setAuthError(error.message);
      }
    } catch {
      setAuthError(`Failed to create account with ${provider}.`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Join pharmacy students excelling with PansGPT
          </p>
        </div>

        {isSuccess ? (
          <div className="rounded-2xl bg-emerald-50 p-6 text-center dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Check your email
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We have sent a verification link to{" "}
              <strong className="text-neutral-900 dark:text-neutral-200">{registeredEmail}</strong>.
              Please click the link to confirm your account and complete your student onboarding.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                <CheckCircle2 className="w-4 h-4" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            {authError && (
              <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* OAuth buttons at the top for instant 1-click registration */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/60 transition-colors disabled:opacity-50"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-3.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16.1C3.5 19.9 7.4 23 12 23z"
                    />
                  </svg>
                )}
                Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuth("apple")}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/60 transition-colors disabled:opacity-50"
              >
                {oauthLoading === "apple" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.72-7.87-12.06-14.36-6.19-9.28-11.12-19.78-14.78-31.51-3.67-11.72-5.5-23.1-5.5-34.12 0-15.42 3.8-28.53 11.41-39.33 7.6-10.8 17.52-16.3 29.74-16.51 5.09 0 10.77 1.34 17.06 4.02 6.29 2.68 10.36 4.07 12.21 4.16 1.45 0 5.79-1.5 13.02-4.51 7.23-3.01 13.25-4.27 18.06-3.79 14.15 1.13 25.13 6.94 32.94 17.43-12.72 7.74-18.9 18.42-18.55 32.04.35 10.66 4.35 19.57 12 26.73 4.17 3.93 9.07 6.84 14.7 8.73-2.61 7.68-5.83 15.28-9.67 22.82zm-35.32-120.3c0 7.42-2.73 14.38-8.19 20.89-6.52 7.6-14.54 12.07-24.06 13.41-.34-1.44-.51-2.88-.51-4.32 0-7.31 2.89-14.34 8.67-21.09 3.01-3.5 6.64-6.32 10.89-8.46 4.25-2.14 8.65-3.32 13.2-3.54v3.11z" />
                  </svg>
                )}
                Apple
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                  Or register with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="student@unijos.edu.ng"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Password (min. 8 characters) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("password")}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-60 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <p className="text-center text-xs text-neutral-600 dark:text-neutral-400 pt-2">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <SignupFormContent />
    </Suspense>
  );
}
