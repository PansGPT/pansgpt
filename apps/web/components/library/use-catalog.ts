"use client";
import { useEffect, useState } from "react";
import type { LibraryCatalogResponse } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { catalogSchema, libraryError } from "@/lib/library-catalog";

export function useCatalog(params: URLSearchParams, revision: number) {
  const { session, profile } = useAuth();
  const token = session?.access_token;
  const owner = profile?.id === session?.user.id ? profile?.id : undefined;
  const university = profile?.university_id;
  const path = params.toString();
  const scope = `${owner}:${university}:${path}`;
  const key = `${scope}:${revision}`;
  const [result, setResult] = useState<{
    key: string;
    scope: string;
    data?: LibraryCatalogResponse;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!token || !owner || !university) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(new DOMException("Library timed out", "TimeoutError")),
      15000
    );
    void fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog?${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw await libraryError(response, "Please try again in a moment.");
        const value: unknown = await response.json();
        const data = catalogSchema.parse(value);
        if (active && !controller.signal.aborted) setResult({ key, scope, data });
      })
      .catch((error: unknown) => {
        if (
          active &&
          (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError")
        )
          setResult({
            key,
            scope,
            error:
              error instanceof Error && error.name !== "ZodError" && error.name !== "TimeoutError"
                ? error.message
                : "Please try again in a moment.",
          });
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, scope, owner, university, token, path]);
  // Retain authorized rows during same-filter refreshes so selection/focus survives.
  const current = result?.scope === scope ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: !current,
    refreshing: Boolean(token && owner && university && current && current.key !== key),
    owner: `${owner}:${university}`,
  };
}
