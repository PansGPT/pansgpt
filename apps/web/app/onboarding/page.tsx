"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap, Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UniversityItem {
  id: string;
  name: string;
  short_name: string;
  slug: string;
}

const ACADEMIC_LEVELS = [
  { value: "100", label: "100 Level (Pre-Pharmacy)" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level (Final Year B.Pharm)" },
  { value: "600", label: "600 Level (PharmD Clinical)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, profile, refreshProfile, loading: authLoading } = useAuth();

  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  // Form State - IMPORTANT: universityId defaults to "" (NO DEFAULT UNIVERSITY)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active universities on mount
  useEffect(() => {
    async function loadUniversities() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/auth/universities`);
        if (res.ok) {
          const data = await res.json();
          setUniversities(data);
        }
      } catch (err) {
        console.error("Failed to load universities", err);
      } finally {
        setLoadingUniversities(false);
      }
    }

    loadUniversities();
  }, []);

  // Pre-fill existing profile fields if available
  useEffect(() => {
    if (profile) {
      if (profile.first_name) setFirstName(profile.first_name);
      if (profile.last_name) setLastName(profile.last_name);
      if (profile.university_id) setUniversityId(profile.university_id);
      if (profile.current_level) setCurrentLevel(profile.current_level);
      if (profile.terms_accepted_at) setTermsAccepted(true);

      // If user is already fully onboarded, redirect straight to /app
      if (profile.is_onboarded) {
        router.replace("/app");
      }
    }
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict validation
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required.");
      return;
    }
    if (!universityId) {
      setError("Please select your university from the list.");
      return;
    }
    if (!currentLevel) {
      setError("Please select your current academic level.");
      return;
    }
    if (!termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = session?.access_token;

      const res = await fetch(`${apiUrl}/api/v1/auth/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          university_id: universityId,
          current_level: currentLevel,
          terms_accepted: termsAccepted,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to complete onboarding.");
      }

      await refreshProfile();
      router.push("/app");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl space-y-8 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Complete Your Student Profile
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Configure your academic context to receive personalized pharmacy monographs and study
            materials.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Personal Names */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              1. Personal Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Elijah"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sani"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>

          {/* Step 2: University Selection - NO DEFAULT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                2. Select Your University
              </h2>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Choose your institution
              </span>
            </div>

            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              disabled={loadingUniversities}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="" disabled>
                {loadingUniversities
                  ? "Loading available universities..."
                  : "-- Select your University --"}
              </option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name} ({uni.short_name})
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Academic Level */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              3. Current Academic Level
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ACADEMIC_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setCurrentLevel(lvl.value)}
                  className={`rounded-xl border p-2.5 text-xs font-medium text-left transition-all ${
                    currentLevel === lvl.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300"
                  }`}
                >
                  <div className="font-bold">{lvl.value} Level</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {lvl.label.replace(`${lvl.value} Level `, "")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Terms & Conditions Agreement */}
          <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              4. Academic & Terms Agreement
            </h2>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300 leading-normal">
                I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>
                . I understand that PansGPT is an educational learning companion for pharmacy
                curriculum and that all institutional materials are protected under academic
                copyright.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Complete Onboarding & Enter PansGPT
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
