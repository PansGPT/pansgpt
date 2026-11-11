import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — PansGPT",
  description: "Privacy Policy and NDPA 2023 Compliance Statement for PansGPT.",
};

export default function PrivacyPage(): React.ReactElement {
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
            Privacy Policy
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary-600, #a1a1aa)", margin: 0 }}>
            Effective Date: November 2026 • NDPA 2023 Compliant • Version 2.4
          </p>
        </header>

        {/* Commitment Banner */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            background: "color-mix(in srgb, #10b981 12%, transparent)",
            border: "1px solid color-mix(in srgb, #10b981 30%, transparent)",
            color: "#10b981",
            display: "flex",
            gap: "14px",
            marginBottom: "40px",
            lineHeight: "1.5",
          }}
        >
          <ShieldCheck size={22} style={{ flex: "none", marginTop: "2px" }} />
          <div>
            <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Our Student Privacy Pledge
            </strong>
            <span style={{ fontSize: "13px", color: "var(--text-secondary-700, #d4d4d8)" }}>
              PansGPT is committed to safeguarding the privacy and academic records of pharmacy
              students and faculty. We never sell your personal data, and we do not use your private
              course documents or clinical notes to train public frontier AI models without
              authorization.
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
              1. Regulatory Compliance (NDPA 2023)
            </h2>
            <p>
              PansGPT processes personal data in strict adherence to the Nigeria Data Protection Act
              (NDPA) 2023. We ensure lawful, fair, and transparent data collection, purpose
              limitation, and data minimization for all Nigerian academic institutions.
            </p>
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
              2. Information We Collect
            </h2>
            <p>We collect information strictly necessary to provide our academic workspace:</p>
            <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
              <li>
                Account credentials (name, institutional email, university department, level).
              </li>
              <li>Course materials and PDF lecture notes uploaded for processing and indexing.</li>
              <li>
                Study chat interactions and practice quiz results within your private session.
              </li>
              <li>
                Device metadata (IP-based approximate city location, device type, active sessions).
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
              3. AI Model Inference & Provider Disclosures
            </h2>
            <p>
              To deliver clinical calculations, semantic monograph search, and study explanations,
              PansGPT routes prompts through authorized backend AI models:
            </p>
            <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
              <li>
                <strong>Google AI Studio (Gemma 4 & Gemini Embeddings)</strong>: Prompts and
                document chunks are processed under enterprise terms for inference and vector
                retrieval.
              </li>
              <li>
                <strong>Groq & OpenRouter (Fallback Engines)</strong>: Utilized via circuit-breakers
                during peak periods to maintain system availability.
              </li>
              <li>
                <strong>Tavily Web Search</strong>: Scoped public queries retrieve current medical
                facts without transmitting student identifiers or private notes.
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
              4. Data Retention & 30-Day Recovery
            </h2>
            <p>
              Deleted study conversations are soft-deleted and remain recoverable by their owner for
              30 days. After 30 days, conversations and associated embeddings are permanently and
              cryptographically purged by automated workers.
            </p>
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
              5. Your Rights & Privacy Center
            </h2>
            <p>
              Under the NDPA 2023, you have the right to access, rectify, port, or erase your
              personal data. You can exercise these rights directly within the app at{" "}
              <strong>Settings &gt; Privacy &amp; Data</strong>, where you can export an archive of
              your data or manage shared links.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
