"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Checkbox, Input, RadioGroup, Select, Skeleton } from "@pansgpt/ui/auth";
import { env } from "@/env";
import { useAuth } from "@/lib/auth-context";
import { profileFailureMessage } from "@/lib/profile-verification";
import { AuthAlert } from "./frame";
import { OnboardingFrame } from "./onboarding-frame";
import { z } from "zod";
const inviteSchema = z.object({
  university_id: z.string(),
  university_name: z.string(),
  university_short_name: z.string().nullable(),
  grant_roles: z.array(z.string()),
  target_level: z.string().nullable(),
  is_valid: z.literal(true),
});
function destination(roles: string[]): string {
  return roles.includes("super_admin")
    ? "/super-admin"
    : roles.includes("university_admin")
      ? "/admin"
      : roles.includes("lecturer")
        ? "/lecturer"
        : "/app";
}
interface University {
  id: string;
  name: string;
  short_name: string | null;
}
const levels = [100, 200, 300, 400, 500, 600].map((level) => ({
  value: String(level),
  label: `${level} Level`,
}));
export function OnboardingForm(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const inviteToken = params.get("invite");
  const [inviteAttempt, setInviteAttempt] = useState(0);
  const [inviteState, setInviteState] = useState<
    { token: string; data: z.infer<typeof inviteSchema> } | { token: string; error: string } | null
  >(null);
  const inviteDetails =
    inviteState?.token === inviteToken && "data" in inviteState ? inviteState.data : null;
  const inviteFailure =
    inviteState?.token === inviteToken && "error" in inviteState ? inviteState.error : null;
  const checkingInvite = Boolean(inviteToken && !inviteDetails && !inviteFailure);
  const { session, profile, profileError, refreshProfile, signOut, loading } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [universityError, setUniversityError] = useState(false);
  const [draft, setDraft] = useState<{
    first?: string;
    last?: string;
    university?: string;
    level?: string;
    terms?: boolean;
  }>({});
  const first = draft.first ?? profile?.first_name ?? "";
  const last = draft.last ?? profile?.last_name ?? "";
  const university =
    inviteDetails?.university_id ?? draft.university ?? profile?.university_id ?? "";
  const level = draft.level ?? inviteDetails?.target_level ?? profile?.current_level ?? "";
  const staff = Boolean(
    inviteDetails?.grant_roles.some((role) =>
      ["lecturer", "university_admin", "super_admin"].includes(role)
    ) ||
    (profile && profile.role !== "student")
  );
  const terms = draft.terms ?? Boolean(profile?.terms_accepted_at);
  const [attempted, setAttempted] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [universityAttempt, setUniversityAttempt] = useState(0);
  useEffect(() => {
    if (!inviteToken) return;
    const controller = new AbortController();
    void fetch(
      `${env.NEXT_PUBLIC_API_URL}/api/v1/auth/invites/${encodeURIComponent(inviteToken)}`,
      { signal: controller.signal, cache: "no-store" }
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This invitation is unavailable or has expired. Ask your administrator for a new invitation."
          );
        const data = inviteSchema.parse(await response.json());
        if (!controller.signal.aborted) setInviteState({ token: inviteToken, data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setInviteState({
            token: inviteToken,
            error:
              "This invitation could not be verified. Please retry or contact your administrator.",
          });
      });
    return () => controller.abort();
  }, [inviteToken, inviteAttempt]);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function loadUniversities(): Promise<void> {
      try {
        const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/universities`, {
          signal,
        });
        if (!response.ok) throw new Error();
        const data: unknown = await response.json();
        if (
          !Array.isArray(data) ||
          !data.length ||
          !data.every(
            (item: unknown) =>
              typeof item === "object" &&
              item !== null &&
              "id" in item &&
              typeof item.id === "string" &&
              "name" in item &&
              typeof item.name === "string" &&
              "short_name" in item &&
              (typeof item.short_name === "string" || item.short_name === null)
          )
        )
          throw new Error();
        setUniversities(data as University[]);
      } catch {
        if (!signal.aborted) setUniversityError(true);
      } finally {
        if (!signal.aborted) setLoadingUniversities(false);
      }
    }
    void loadUniversities();
    return () => controller.abort();
  }, [universityAttempt]);
  useEffect(() => {
    if (profile?.is_onboarded && !inviteToken) router.replace(destination(profile.roles));
  }, [profile, router, inviteToken]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const goToStep = (next: number): void => {
    setStep(next);
    setAttempted(false);
    setError(null);
  };
  const complete = async (): Promise<void> => {
    pending.current = true;
    setBusy(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Your session has ended. Please sign in again.");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const invite = inviteToken;
      if (invite) {
        const redeemed = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/v1/auth/invites/${encodeURIComponent(invite)}/redeem`,
          { method: "POST", headers }
        );
        if (!redeemed.ok) {
          const detail = z
            .object({ detail: z.string() })
            .safeParse(await redeemed.json().catch(() => null));
          throw new Error(
            detail.success
              ? detail.data.detail
              : "This invitation could not be accepted. Please contact your university administrator."
          );
        }
      }
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/onboard`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          first_name: first.trim(),
          last_name: last.trim(),
          university_id: university,
          current_level: staff ? null : level,
          terms_accepted: true,
        }),
      });
      if (!response.ok)
        throw new Error(
          "Your profile could not be saved. Your entries are still here; please retry."
        );
      const confirmed = await refreshProfile();
      if (!confirmed?.is_onboarded)
        throw new Error("Your saved profile could not be verified. Please retry.");
      router.replace(destination(confirmed.roles));
      router.refresh();
    } catch (failure: unknown) {
      setError(
        failure instanceof Error && failure.message !== "Failed to fetch"
          ? failure.message
          : "We could not connect. Your entries are still here; please retry."
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const titles = [
    "What's your name?",
    "Where are you studying?",
    staff ? "Your workspace access" : "What level are you in?",
    "Ready to make it yours?",
  ];
  const descriptions = [
    "Let's start with what we should call you.",
    "Choose your university to set your academic context.",
    staff
      ? "Your institution determines your access. Review your invitation before continuing."
      : "Pick your current academic level. You can update it later.",
    `${first.trim() || "One last step"}, take a moment to check your details.`,
  ];
  const selectedUniversity =
    universities.find((item) => item.id === university) ??
    (inviteDetails
      ? {
          id: inviteDetails.university_id,
          name: inviteDetails.university_name,
          short_name: inviteDetails.university_short_name,
        }
      : undefined);
  return (
    <OnboardingFrame
      step={step}
      steps={staff ? ["Your name", "University", "Workspace", "Review"] : undefined}
      title={titles[step]!}
      description={descriptions[step]!}
      busy={busy}
      back={() => goToStep(Math.max(0, step - 1))}
      footer={
        profile && (
          <>
            <span>Signed in as {profile.email}</span>
            <button
              className="auth-link"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await signOut();
                  router.replace("/login");
                } catch {
                  setError("We could not sign out. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Sign out
            </button>
          </>
        )
      }
    >
      {checkingInvite ? (
        <div role="status">Verifying your invitation…</div>
      ) : inviteFailure ? (
        <div className="auth-form">
          <AuthAlert>{inviteFailure}</AuthAlert>
          <Button
            leadingIcon={null}
            trailingIcon={null}
            onClick={() => setInviteAttempt((value) => value + 1)}
          >
            Retry invitation
          </Button>
        </div>
      ) : loading ? (
        <div className="onboarding-loading" role="status" aria-label="Loading profile">
          <Skeleton style={{ height: 52 }} />
          <Skeleton style={{ height: 52 }} />
        </div>
      ) : !profile ? (
        <div className="auth-form">
          <AuthAlert>
            {profileError
              ? profileFailureMessage(profileError).description
              : "Your profile could not be loaded. Please retry before continuing."}
          </AuthAlert>
          <Button
            leadingIcon={null}
            trailingIcon={null}
            disabled={busy}
            onClick={async () => {
              if (profileError?.code === "session_unavailable") {
                window.location.reload();
                return;
              }
              setBusy(true);
              try {
                await refreshProfile();
              } finally {
                setBusy(false);
              }
            }}
          >
            Retry profile
          </Button>
        </div>
      ) : (
        <form
          className="auth-form onboarding-form"
          noValidate
          aria-busy={busy}
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending.current) return;
            setAttempted(true);
            setError(null);
            if (
              step === 0 &&
              (!first.trim() ||
                !last.trim() ||
                first.trim().length > 100 ||
                last.trim().length > 100)
            ) {
              setError("Enter your first and last name to continue.");
              return;
            }
            if (
              step === 1 &&
              (!selectedUniversity || (!inviteDetails && (loadingUniversities || universityError)))
            ) {
              setError("Choose an available university to continue.");
              return;
            }
            if (step === 2 && !staff && !levels.some((item) => item.value === level)) {
              setError("Choose your academic level to continue.");
              return;
            }
            if (step < 3) {
              goToStep(step + 1);
              return;
            }
            if (!first.trim() || !last.trim()) {
              goToStep(0);
              return;
            }
            if (!selectedUniversity) {
              goToStep(1);
              return;
            }
            if (!staff && !levels.some((item) => item.value === level)) {
              goToStep(2);
              return;
            }
            if (!terms) {
              setError("Please agree to the Terms of Service and Privacy Policy to continue.");
              return;
            }
            await complete();
          }}
        >
          {error && (
            <div tabIndex={-1} ref={errorRef}>
              <AuthAlert>{error}</AuthAlert>
            </div>
          )}
          <div className="onboarding-step" key={step}>
            {step === 0 && (
              <div className="onboarding-name-fields">
                <Input
                  label="First name"
                  autoComplete="given-name"
                  required
                  maxLength={100}
                  disabled={busy}
                  value={first}
                  placeholder="Your first name"
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, first: event.target.value }))
                  }
                  error={attempted && !first.trim() ? "Enter your first name." : undefined}
                />
                <Input
                  label="Last name"
                  autoComplete="family-name"
                  required
                  maxLength={100}
                  disabled={busy}
                  value={last}
                  placeholder="Your last name"
                  onChange={(event) =>
                    setDraft((value) => ({ ...value, last: event.target.value }))
                  }
                  error={attempted && !last.trim() ? "Enter your last name." : undefined}
                />
              </div>
            )}
            {step === 1 && (
              <div className="auth-form">
                {universityError && (
                  <>
                    <AuthAlert>Universities could not be loaded.</AuthAlert>
                    <Button
                      variant="secondary"
                      type="button"
                      leadingIcon={null}
                      trailingIcon={null}
                      onClick={() => {
                        setLoadingUniversities(true);
                        setUniversityError(false);
                        setUniversityAttempt((value) => value + 1);
                      }}
                    >
                      Retry universities
                    </Button>
                  </>
                )}
                <Select
                  label="University"
                  placeholder={
                    loadingUniversities ? "Loading universities..." : "Choose your university"
                  }
                  required
                  disabled={busy || loadingUniversities || universityError || Boolean(inviteToken)}
                  value={university}
                  onValueChange={(value) =>
                    setDraft((draftValue) => ({ ...draftValue, university: value }))
                  }
                  options={(inviteDetails && selectedUniversity
                    ? [selectedUniversity]
                    : universities
                  ).map((item) => ({
                    value: item.id,
                    label: item.short_name ? `${item.name} (${item.short_name})` : item.name,
                  }))}
                  error={attempted && !selectedUniversity ? "Choose your university." : undefined}
                />
                <p className="auth-help">Only participating universities are listed here.</p>
              </div>
            )}
            {step === 2 && staff ? (
              <p className="auth-help">
                {inviteDetails?.grant_roles.includes("university_admin")
                  ? "Administrative access"
                  : inviteDetails?.grant_roles.includes("lecturer")
                    ? "Faculty access"
                    : "Staff access"}{" "}
                at {selectedUniversity?.name}. Access is verified by your institution when you
                accept this invitation.
              </p>
            ) : (
              step === 2 && (
                <>
                  <RadioGroup
                    label="Academic level"
                    className="onboarding-levels"
                    value={level}
                    onValueChange={(value) =>
                      setDraft((draftValue) => ({ ...draftValue, level: value }))
                    }
                    required
                    disabled={busy}
                    options={levels}
                    aria-invalid={attempted && !level}
                    aria-describedby={attempted && !level ? "level-error" : undefined}
                  />
                  {attempted && !level && (
                    <p id="level-error" className="auth-field-error">
                      Choose your academic level.
                    </p>
                  )}
                </>
              )
            )}
            {step === 3 && (
              <>
                <dl className="onboarding-review">
                  {[
                    { label: "Name", value: `${first.trim()} ${last.trim()}`, target: 0 },
                    {
                      label: "University",
                      value: selectedUniversity?.name || "Not selected",
                      target: 1,
                    },
                    staff
                      ? { label: "Workspace", value: "Institutional staff", target: 2 }
                      : { label: "Academic level", value: `${level} Level`, target: 2 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        className="auth-link"
                        aria-label={`Edit ${item.label.toLowerCase()}`}
                        onClick={() => goToStep(item.target)}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </dl>
                <div className="onboarding-agreement">
                  <Checkbox
                    label="I agree to the Terms of Service and Privacy Policy"
                    checked={terms}
                    disabled={busy}
                    onCheckedChange={(checked) =>
                      setDraft((value) => ({ ...value, terms: checked === true }))
                    }
                    aria-invalid={attempted && !terms}
                    aria-describedby={attempted && !terms ? "terms-error" : undefined}
                  />
                  {attempted && !terms && (
                    <p id="terms-error" className="auth-field-error">
                      Your agreement is required to continue.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <Button
            type="submit"
            leadingIcon={null}
            trailingIcon={null}
            loading={busy}
            loadingText="Saving profile..."
            disabled={
              busy || (step === 1 && !inviteDetails && (loadingUniversities || universityError))
            }
          >
            {step === 3 ? "Complete profile" : "Continue"}
          </Button>
        </form>
      )}
    </OnboardingFrame>
  );
}
