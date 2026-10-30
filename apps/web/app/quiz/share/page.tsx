"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { QuizShareSummary } from "@pansgpt/types";
import { quizShareSchema } from "@/lib/quiz-api";
import "@pansgpt/ui/styles.css";
import "@/components/quiz/quiz.css";

function subscribeHash(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export default function SharedQuizPage(): React.ReactElement {
  const [summary, setSummary] = useState<QuizShareSummary | null>(null);
  const [error, setError] = useState(false);
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => null
  );
  const invalid = hash !== null && !/^[A-Za-z0-9_-]{30,100}$/.test(hash);
  useEffect(() => {
    const controller = new AbortController();
    if (hash === null || invalid) return;
    const token = hash;
    void fetch(`/api/quiz/shared`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value = quizShareSchema.parse(await response.json());
        if (!controller.signal.aborted) setSummary(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [hash, invalid]);
  return (
    <main className="quiz-shared-page">
      <section className="quiz-shared-card">
        <span className="quiz-overline">PansGPT / Quiz result</span>
        {error || invalid ? (
          <>
            <h1>This result is no longer shared.</h1>
            <p>The owner may have revoked the link.</p>
          </>
        ) : summary ? (
          <>
            <p className="quiz-shared-score">
              {Math.round(summary.percentage)}
              <small>%</small>
            </p>
            <h1>{summary.title}</h1>
            <p>
              {summary.course_code} · {summary.question_count} questions
            </p>
            <p>{new Date(summary.completed_at).toLocaleDateString()}</p>
          </>
        ) : (
          <p role="status">Opening shared result…</p>
        )}
        <Link href="/signup" className="quiz-text-button">
          Create an account →
        </Link>
      </section>
    </main>
  );
}
