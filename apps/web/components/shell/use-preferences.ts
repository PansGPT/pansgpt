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
  const [credits, setCredits] = useState<number | null>(null);
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
      supabase.from("user_credits").select("balance").eq("user_id", userId).maybeSingle(),
      universityId
        ? supabase.from("universities").select("name").eq("id", universityId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
      .then(([preference, balance, institution]) => {
        if (!current) return;
        setCredits(balance.error ? null : (balance.data?.balance ?? null));
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
  return { theme, ready, save, status, university, credits };
}
