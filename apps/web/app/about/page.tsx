import Link from "next/link";
import { ArrowLeft, Sparkles, BookOpen, ShieldCheck, Heart } from "lucide-react";
import { BrandMark } from "@/components/auth/brand-art";

export const metadata = {
  title: "About PansGPT — Clinical AI for Pharmacy Education",
  description:
    "Learn more about PansGPT, our mission, clinical intelligence engine, and pharmacy curriculum support.",
};

export default function AboutPage(): React.ReactElement {
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

        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.12)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <BrandMark />
          </div>
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              PansGPT
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-tertiary-600, #a1a1aa)",
                margin: "4px 0 0",
              }}
            >
              Version 2.0.0 (Build 2026.11)
            </p>
          </div>
        </div>

        {/* Mission Statement */}
        <section
          style={{
            background: "var(--bg-secondary, #18181b)",
            border: "1px solid var(--border-secondary, #27272a)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px" }}>
            The AI Study Companion for Pharmacy Students
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.6,
              color: "var(--text-secondary-700, #d4d4d8)",
              margin: 0,
            }}
          >
            PansGPT is purpose-built to empower pharmacy students across Nigeria and West Africa
            with rigorous clinical knowledge, monograph-grounded retrieval, dosage calculators,
            interactive study quizzes, and offline-capable course materials.
          </p>
        </section>

        {/* Feature Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary, #18181b)",
              border: "1px solid var(--border-secondary, #27272a)",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
            >
              <BookOpen size={18} color="var(--fg-brand-primary-600, #10b981)" />
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Faculty Monographs</h3>
            </div>
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-tertiary-600, #a1a1aa)",
                margin: 0,
              }}
            >
              Grounded in verified pharmacology, pharmacognosy, and clinical pharmacy textbooks and
              monographs.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-secondary, #18181b)",
              border: "1px solid var(--border-secondary, #27272a)",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
            >
              <Sparkles size={18} color="var(--fg-brand-primary-600, #10b981)" />
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Clinical AI Engine</h3>
            </div>
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-tertiary-600, #a1a1aa)",
                margin: 0,
              }}
            >
              Multi-tiered intelligence powered by Gemma 4 and fast inference for instantaneous
              clarifications and study queries.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-secondary, #18181b)",
              border: "1px solid var(--border-secondary, #27272a)",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
            >
              <ShieldCheck size={18} color="var(--fg-brand-primary-600, #10b981)" />
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>
                Privacy & Data Integrity
              </h3>
            </div>
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-tertiary-600, #a1a1aa)",
                margin: 0,
              }}
            >
              Tenant-scoped university isolation, zero data sharing without consent, and full
              student control over conversations.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-secondary, #18181b)",
              border: "1px solid var(--border-secondary, #27272a)",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
            >
              <Heart size={18} color="var(--fg-brand-primary-600, #10b981)" />
              <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Built for Students</h3>
            </div>
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-tertiary-600, #a1a1aa)",
                margin: 0,
              }}
            >
              Created in partnership with pharmacy student leaders to tackle exam pressure, drug
              formulation, and dosage calculation challenges.
            </p>
          </div>
        </div>

        {/* Footer links */}
        <footer
          style={{
            borderTop: "1px solid var(--border-secondary, #27272a)",
            paddingTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            fontSize: "13px",
            color: "var(--text-tertiary-600, #a1a1aa)",
          }}
        >
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
            Terms of Service
          </Link>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/usage" style={{ color: "inherit", textDecoration: "none" }}>
            Usage Policy
          </Link>
          <Link href="/licenses" style={{ color: "inherit", textDecoration: "none" }}>
            Licenses
          </Link>
        </footer>
      </div>
    </div>
  );
}
