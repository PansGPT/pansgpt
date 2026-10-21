"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Checkbox, Input, Select } from "@pansgpt/ui/auth";
import { env } from "@/env";
import { useAuth } from "@/lib/auth-context";
import { AuthAlert, AuthFrame } from "./frame";
import { AuthLoading } from "./loading";
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
  const { session, profile, refreshProfile, signOut, loading } = useAuth();
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
  const university = draft.university ?? profile?.university_id ?? "";
  const level = draft.level ?? profile?.current_level ?? "";
  const terms = draft.terms ?? Boolean(profile?.terms_accepted_at);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [universityAttempt, setUniversityAttempt] = useState(0);
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
    if (profile?.is_onboarded) router.replace("/app");
  }, [profile, router]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  if (loading) return <AuthLoading />;
  return (
    <AuthFrame
      title="Make this space yours"
      description="Tell us a little about your studies so we can set up your academic profile."
    >
      {!profile ? (
        <div className="auth-form">
          <AuthAlert>Your profile could not be loaded. Please retry before continuing.</AuthAlert>
          <Button
            leadingIcon={null}
            trailingIcon={null}
            disabled={busy}
            onClick={async () => {
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
          <Button
            variant="secondary"
            leadingIcon={null}
            trailingIcon={null}
            onClick={() => void signOut().then(() => router.replace("/login"))}
          >
            Sign out
          </Button>
        </div>
      ) : (
        <form
          className="auth-form"
          noValidate
          aria-busy={busy}
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending.current) return;
            setAttempted(true);
            setError(null);
            if (!first.trim() || !last.trim() || !university || !level || !terms) {
              setError("Complete the required fields below to continue.");
              return;
            }
            if (
              !universities.some((item) => item.id === university) ||
              !levels.some((item) => item.value === level)
            ) {
              setError("Choose an available university and academic level.");
              return;
            }
            pending.current = true;
            setBusy(true);
            try {
              const token = session?.access_token;
              if (!token) throw new Error("Your session has ended. Please sign in again.");
              const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              };
              const invite = params.get("invite");
              if (invite) {
                const redeemed = await fetch(
                  `${env.NEXT_PUBLIC_API_URL}/api/v1/auth/invites/${encodeURIComponent(invite)}/redeem`,
                  { method: "POST", headers }
                );
                if (!redeemed.ok)
                  throw new Error(
                    "This invitation could not be accepted. Please contact your university administrator."
                  );
              }
              const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/onboard`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  first_name: first.trim(),
                  last_name: last.trim(),
                  university_id: university,
                  current_level: level,
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
              router.replace("/app");
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
          }}
        >
          {error && (
            <div ref={errorRef} tabIndex={-1}>
              <AuthAlert>{error}</AuthAlert>
            </div>
          )}
          <fieldset disabled={busy} className="auth-fieldset">
            <legend>Your name</legend>
            <div className="auth-name-fields">
              <Input
                label="First name"
                autoComplete="given-name"
                required
                value={first}
                onChange={(event) => setDraft((value) => ({ ...value, first: event.target.value }))}
                error={attempted && !first.trim() ? "Enter your first name." : undefined}
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                required
                value={last}
                onChange={(event) => setDraft((value) => ({ ...value, last: event.target.value }))}
                error={attempted && !last.trim() ? "Enter your last name." : undefined}
              />
            </div>
          </fieldset>
          {universityError && (
            <div className="auth-form">
              <AuthAlert>Universities could not be loaded.</AuthAlert>
              <Button
                variant="secondary"
                type="button"
                leadingIcon={null}
                trailingIcon={null}
                onClick={() => {
                  setLoadingUniversities(true);
                  setUniversityError(false);
                  setUniversityAttempt((attempt) => attempt + 1);
                }}
              >
                Retry universities
              </Button>
            </div>
          )}
          <Select
            label="University"
            placeholder={loadingUniversities ? "Loading universities..." : "Choose your university"}
            required
            disabled={busy || loadingUniversities || universityError}
            value={university}
            onValueChange={(value) =>
              setDraft((draftValue) => ({ ...draftValue, university: value }))
            }
            options={universities.map((item) => ({
              value: item.id,
              label: item.short_name ? `${item.name} (${item.short_name})` : item.name,
            }))}
            error={attempted && !university ? "Choose your university." : undefined}
          />
          <Select
            label="Academic level"
            placeholder="Choose your level"
            required
            disabled={busy}
            value={level}
            onValueChange={(value) => setDraft((draftValue) => ({ ...draftValue, level: value }))}
            options={levels}
            error={attempted && !level ? "Choose your academic level." : undefined}
          />
          <div>
            <Checkbox
              label="I agree to the Terms of Service and Privacy Policy"
              disabled={busy}
              checked={terms}
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
          <Button
            type="submit"
            leadingIcon={null}
            trailingIcon={null}
            loading={busy}
            loadingText="Saving profile..."
            disabled={busy || loadingUniversities || universityError}
          >
            Complete profile
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
