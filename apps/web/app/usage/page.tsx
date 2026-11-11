import Link from "next/link";
import { ArrowLeft, FileCheck } from "lucide-react";

export const metadata = {
  title: "Usage Policy — PansGPT",
  description: "Acceptable AI Use Policy and Academic Guidelines for PansGPT.",
};

export default function UsagePage(): React.ReactElement {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary, #121212)",
        color: "var(--text-primary-900, #f4f4f5)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        padding: "48px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {/* Back Link */}
        <Link
          href="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "var(--text-tertiary-600, #a1a1aa)",
            textDecoration: "none",
            marginBottom: "32px",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to PansGPT</span>
        </Link>

        {/* Header */}
        <header style={{ marginBottom: "36px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            Usage Policy
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary-600, #a1a1aa)", margin: 0 }}>
            Acceptable AI Use Guidelines • Version 2.4
          </p>
        </header>

        {/* Commitment Banner */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            background: "color-mix(in srgb, #3b82f6 12%, transparent)",
            border: "1px solid color-mix(in srgb, #3b82f6 30%, transparent)",
            color: "#3b82f6",
            display: "flex",
            gap: "14px",
            marginBottom: "40px",
            lineHeight: "1.5",
          }}
        >
          <FileCheck size={22} style={{ flex: "none", marginTop: "2px" }} />
          <div>
            <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Academic Integrity & Safe Science
            </strong>
            <span style={{ fontSize: "13px", color: "var(--text-secondary-700, #d4d4d8)" }}>
              PansGPT is built to empower future pharmacists and clinical researchers with
              high-speed synthesis of coursework and literature. We enforce strict safety filters
              around controlled substances and academic honesty.
            </span>
          </div>
        </div>

        {/* Sections */}
        <article
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            fontSize: "14.5px",
            lineHeight: "1.7",
            color: "var(--text-secondary-700, #d4d4d8)",
          }}
        >
          <section>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text-primary-900, #fff)",
                margin: "0 0 12px",
              }}
            >
              1. Permitted Uses
            </h2>
            <p>You may use PansGPT to:</p>
            <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
              <li>
                Summarize pharmaceutical chemistry lectures, pharmacognosy monographs, and
                pharmacology textbooks.
              </li>
              <li>
                Verify drug mechanisms of action, pharmacokinetics, and clinical drug-drug
                interactions.
              </li>
              <li>
                Practice pediatric and renal dosage calculations using the integrated AI skill
                calculators.
              </li>
              <li>
                Generate diagnostic flashcards and practice multiple-choice questions for
                self-assessment.
              </li>
            </ul>
          </section>

          <section>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text-primary-900, #fff)",
                margin: "0 0 12px",
              }}
            >
              2. Prohibited Activities
            </h2>
            <p>You must NOT use PansGPT for:</p>
            <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
              <li>
                <strong>Illicit Synthesis</strong>: Requesting practical instructions, yield
                optimizations, or recipes for illicit drugs, controlled substances, biological
                toxins, or dangerous chemicals.
              </li>
              <li>
                <strong>Exam Malpractice</strong>: Live cheating during proctored examinations or
                university assessments.
              </li>
              <li>
                <strong>Prompt Injection & Abuse</strong>: Attempting jailbreaks, prompt injection,
                or reverse-engineering backend system prompts and institutional API keys.
              </li>
              <li>
                <strong>Automated Scraping</strong>: Running automated crawlers or excessive
                automated bots that overload free-tier university compute resources.
              </li>
            </ul>
          </section>

          <section>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text-primary-900, #fff)",
                margin: "0 0 12px",
              }}
            >
              3. Safety Filtering & Enforcement
            </h2>
            <p>
              PansGPT incorporates multi-stage safety classification. Inquiries flagged for safety
              violations may result in immediate request rejection, temporary rate limiting, or
              institutional account suspension upon review.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
