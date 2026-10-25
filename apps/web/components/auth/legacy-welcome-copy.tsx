"use client";
import { useEffect, useState } from "react";

// Original legacy authConstants copy; profile and authentication contracts stay in the API.
const messages = [
  "Join a community of future pharmacists leveraging AI to simplify complex concepts and ace their exams.",
  "Access your full pharmacy curriculum - lecture notes, past questions, and study guides - all in one place.",
  "Generate quizzes, test your knowledge, and walk into every exam knowing you're prepared.",
  "Built from the trenches of pharmacy school. We know what it takes to pass - and we built the tool to help you do it.",
] as const;

export function LegacyWelcomeCopy({ mobile = false }: { mobile?: boolean }): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [characters, setCharacters] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const message = messages[index]!;
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reducedMotion) return;
    if (!mobile) {
      const timer = window.setTimeout(
        () => setIndex((current) => (current + 1) % messages.length),
        6500
      );
      return () => window.clearTimeout(timer);
    }
    const delay = !deleting && characters === message.length ? 2400 : deleting ? 19 : 38;
    const timer = window.setTimeout(() => {
      if (!deleting && characters === message.length) setDeleting(true);
      else if (deleting && characters === 0) {
        setIndex((current) => (current + 1) % messages.length);
        setDeleting(false);
      } else setCharacters((current) => current + (deleting ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [characters, deleting, index, message.length, mobile, reducedMotion]);
  return (
    <div className={mobile ? "auth-welcome-copy" : "auth-story-copy"}>
      <span className="auth-pharmacy-badge">Built for Pharmacy School</span>
      <p className="auth-legacy-message">
        <span className="auth-sr-only">{mobile ? messages[0] : message}</span>
        <span aria-hidden="true">
          {mobile && !reducedMotion ? message.slice(0, characters) : message}
        </span>
        {mobile && <span className="auth-typing-cursor" aria-hidden="true" />}
      </p>
      {!mobile && (
        <div className="auth-message-selectors" aria-label="Welcome messages">
          {messages.map((text, position) => (
            <button
              key={text}
              type="button"
              aria-label={`Show welcome message ${position + 1}`}
              aria-pressed={position === index}
              onClick={() => setIndex(position)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
