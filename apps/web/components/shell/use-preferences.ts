"use client";
import { useEffect, useRef, useState } from "react";
import { isThemeName, useTheme, type ThemeName } from "@pansgpt/ui/shell";
import { createClient } from "@/lib/supabase/client";

export function storedTheme(value: string): ThemeName | null {
  if (value === "oled_dark") return "dark";
  return isThemeName(value) ? value : null;
}

export function usePreferences(userId: string, universityId: string | null) {
  const [supabase] = useState(createClient);
  const { theme, setTheme, ready } = useTheme();
  const [university, setUniversity] = useState<string | null>(null);
  const [creditState, setCreditState] = useState<{
    userId: string;
    balance: number | null;
    total: number | null;
  }>({ userId, balance: null, total: null });
  const credits = creditState.userId === userId ? creditState.balance : null;
  const creditsTotal = creditState.userId === userId ? creditState.total : null;
  const [status, setStatus] = useState<"loading" | "saved" | "saving" | "local">("loading");
  const revision = useRef(0);
  const owner = useRef(userId);
  const writes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    owner.current = userId;
    let current = true;
    const startedAt = ++revision.current;
    void Promise.all([
      supabase.from("user_preferences").select("theme").eq("user_id", userId).maybeSingle(),
      universityId
        ? supabase.from("universities").select("name").eq("id", universityId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
      .then(([preference, institution]) => {
        if (!current) return;
        setUniversity(institution.error ? null : (institution.data?.name ?? null));
        if (revision.current !== startedAt) return;
        const saved = preference.data ? storedTheme(preference.data.theme) : null;
        if (saved) setTheme(saved);
        setStatus(preference.error ? "local" : "saved");
      })
      .catch(() => {
        if (current && revision.current === startedAt) setStatus("local");
      });
    return () => {
      current = false;
      owner.current = "";
    };
  }, [setTheme, supabase, universityId, userId]);

  useEffect(() => {
    let current = true;
    let request = 0;
    async function refreshCredits(): Promise<void> {
      const version = ++request;
      try {
        const { data, error } = await supabase
          .from("user_credits")
          .select("balance,lifetime_earned")
          .eq("user_id", userId)
          .maybeSingle();
        if (!current || version !== request) return;
        setCreditState({
          userId,
          balance: error ? null : (data?.balance ?? null),
          total: error ? null : (data?.lifetime_earned ?? null),
        });
      } catch {
        if (current && version === request) setCreditState({ userId, balance: null, total: null });
      }
    }
    const refresh = (): void => {
      void refreshCredits();
    };
    const onVisible = (): void => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pansgpt-credits-changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      current = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pansgpt-credits-changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, userId]);

  function save(next: ThemeName): void {
    setTheme(next);
    setStatus("saving");
    const change = ++revision.current;
    const account = userId;
    // Serialize account writes so slower requests cannot overwrite a newer choice.
    writes.current = writes.current
      .catch(() => undefined)
      .then(async () => {
        if (owner.current !== account || revision.current !== change) return;
        try {
          const { error } = await supabase.from("user_preferences").upsert(
            {
              user_id: account,
              theme: next === "dark" ? "oled_dark" : next,
            },
            { onConflict: "user_id" }
          );
          if (owner.current === account && revision.current === change)
            setStatus(error ? "local" : "saved");
        } catch {
          if (owner.current === account && revision.current === change) setStatus("local");
        }
      });
  }
  return { theme, ready, save, status, university, credits, creditsTotal };
}
