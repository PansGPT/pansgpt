import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Terms of Service — PansGPT",
  description: "Terms of Service and Educational Disclaimer for PansGPT.",
};

export default function TermsPage(): React.ReactElement {
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
            Terms of Service
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary-600, #a1a1aa)", margin: 0 }}>
            Effective Date: November 2026 • Version 2.4
          </p>
        </header>

        {/* Clinical Disclaimer Banner */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "12px",
            background: "color-mix(in srgb, #f59e0b 12%, transparent)",
            border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
            color: "#f59e0b",
            display: "flex",
            gap: "14px",
            marginBottom: "40px",
            lineHeight: "1.5",
          }}
        >
          <ShieldAlert size={22} style={{ flex: "none", marginTop: "2px" }} />
          <div>
            <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Medical & Clinical Study Aid Disclaimer
            </strong>
            <span style={{ fontSize: "13px", color: "var(--text-secondary-700, #d4d4d8)" }}>
              PansGPT is designed exclusively as an academic study companion and reference tool for
              pharmacy students, healthcare trainees, and educators.{" "}
              <strong>
                PansGPT is NOT certified medical diagnostic software or an autonomous prescribing
                system.
              </strong>{" "}
              Always verify drug calculations, dosages, contraindications, and treatment plans
              against authoritative medical sources, the Nigerian Essential Drugs List, and clinical
              preceptors.
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
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using PansGPT (including our web application, desktop app, and mobile
              interfaces), you agree to be bound by these Terms of Service. If you are using PansGPT
              on behalf of an educational institution or university faculty, you represent that you
              have the authority to bind that entity to these terms.
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
              2. Educational Use & Academic Integrity
            </h2>
            <p>
              PansGPT provides AI-assisted retrieval, document parsing, monograph analysis, and
              practice quiz generation to support your learning. You agree to use PansGPT in
              accordance with your university&apos;s academic honor code. PansGPT is not intended
              for live examination malpractice, unauthorized assignment completion, or circumventing
              institutional assessment protocols.
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
              3. User Accounts & Tenancy Isolation
            </h2>
            <p>
              To access personalized course libraries and study quizzes, you must register an
              account. You are responsible for maintaining the confidentiality of your login
              credentials and managing active linked devices. Multi-tenant university libraries are
              strictly scoped to verified institutional domains.
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
              4. Document Ingestion & Intellectual Property
            </h2>
            <p>
              Users may upload lecture slides, PDF monographs, and study notes. You retain ownership
              of any personal study materials you upload. You warrant that you have the right to
              process such materials. PansGPT processes documents solely to provide study
              assistance, semantic search, and quiz generation within your isolated tenant.
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
              5. Study Credits & Billing
            </h2>
            <p>
              Advanced AI queries and slide-to-note generation consume study credits. Credit bundles
              and subscriptions processed through authorized payment gateways (e.g., Paystack) are
              billed in Nigerian Naira (NGN). Unused promotional credits are non-refundable and
              expire according to the terms stated at issuance.
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
              6. Governing Law
            </h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the laws of
              the Federal Republic of Nigeria, without regard to conflict of law principles.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
