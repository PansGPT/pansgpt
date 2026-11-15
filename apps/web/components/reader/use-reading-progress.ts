"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReaderProgressRequest } from "@pansgpt/types";
import { env } from "@/env";
import { openedSchema } from "@/lib/library-catalog";

export function useReadingProgress(
  documentId: string,
  token: string | undefined,
  initialPage: number,
  active: boolean
) {
  const latest = useRef(initialPage);
  const saved = useRef<number | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "pending" | "error">("pending");
  const inFlight = useRef(false);
  const updatePage = useCallback((page: number) => {
    if (latest.current === page) return;
    latest.current = page;
    setStatus((previous) =>
      previous === "error" ? "error" : saved.current === page ? "saved" : "pending"
    );
  }, []);
  const saveNow = useRef<() => void>(() => undefined);
  const retry = useCallback(() => saveNow.current(), []);
  useEffect(() => {
    if (!token || !active) return;
    const controller = new AbortController();
    const url = `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${documentId}/progress`;
    const request = (page: number, keepalive: boolean): Promise<Response> =>
      fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ page } satisfies ReaderProgressRequest),
        cache: "no-store",
        keepalive,
        signal: keepalive
          ? undefined
          : AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
    async function save(): Promise<void> {
      if (inFlight.current || latest.current === saved.current || controller.signal.aborted) return;
      inFlight.current = true;
      const page = latest.current;
      setStatus("saving");
      try {
        const response = await request(page, false);
        if (!response.ok) throw new Error("Progress unavailable");
        const result = openedSchema.parse(await response.json());
        if (result.document_id !== documentId || result.last_page_read !== page)
          throw new Error("Position mismatch");
        if (!controller.signal.aborted) {
          saved.current = page;
          setStatus(latest.current === page ? "saved" : "pending");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      } finally {
        inFlight.current = false;
      }
    }
    function flush(): void {
      if (latest.current !== saved.current)
        void request(latest.current, true).catch(() => undefined);
    }
    function visibility(): void {
      if (document.visibilityState === "hidden") flush();
    }
    saveNow.current = () => {
      void save();
    };
    void save();
    const timer = setInterval(() => {
      void save();
    }, 30000);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      controller.abort();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
      flush();
      saveNow.current = () => undefined;
    };
  }, [documentId, token, active]);
  return { status, updatePage, retry };
}
