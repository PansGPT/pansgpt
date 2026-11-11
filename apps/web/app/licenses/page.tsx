import Link from "next/link";
import { ArrowLeft, Code } from "lucide-react";

export const metadata = {
  title: "Open Source Licenses — PansGPT",
  description: "Third-party software notices and open source licenses used in PansGPT.",
};

const LICENSES = [
  {
    name: "React & React DOM",
    license: "MIT License",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    url: "https://github.com/facebook/react",
  },
  {
    name: "Next.js",
    license: "MIT License",
    copyright: "Copyright (c) 2024 Vercel, Inc.",
    url: "https://github.com/vercel/next.js",
  },
  {
    name: "Lucide Icons",
    license: "ISC License",
    copyright:
      "Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) 2022-present Lucide Contributors.",
    url: "https://lucide.dev",
  },
  {
    name: "Radix UI Primitives",
    license: "MIT License",
    copyright: "Copyright (c) 2022 WorkOS",
    url: "https://www.radix-ui.com",
  },
  {
    name: "Tailwind CSS",
    license: "MIT License",
    copyright: "Copyright (c) Tailwind Labs, Inc.",
    url: "https://tailwindcss.com",
  },
  {
    name: "Framer Motion",
    license: "MIT License",
    copyright: "Copyright (c) 2018 Framer B.V.",
    url: "https://www.framer.com/motion",
  },
];

export default function LicensesPage(): React.ReactElement {
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
        <header style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            Open Source Licenses
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-tertiary-600, #a1a1aa)", margin: 0 }}>
            PansGPT is built with gratitude on these open source technologies and libraries.
          </p>
        </header>

        {/* License Cards */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}
        >
          {LICENSES.map((item) => (
            <div
              key={item.name}
              style={{
                background: "var(--bg-secondary, #18181b)",
                border: "1px solid var(--border-secondary, #27272a)",
                borderRadius: "12px",
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Code size={16} color="var(--fg-brand-primary-600, #10b981)" />
                  <strong style={{ fontSize: "15px", fontWeight: 600 }}>{item.name}</strong>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text-secondary-700, #d4d4d8)",
                  }}
                >
                  {item.license}
                </span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-tertiary-600, #a1a1aa)",
                  margin: "0 0 4px",
                  lineHeight: 1.4,
                }}
              >
                {item.copyright}
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "12px",
                  color: "var(--fg-brand-primary-600, #10b981)",
                  textDecoration: "none",
                }}
              >
                {item.url}
              </a>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid var(--border-secondary, #27272a)",
            paddingTop: "24px",
            display: "flex",
            gap: "20px",
            fontSize: "13px",
            color: "var(--text-tertiary-600, #a1a1aa)",
          }}
        >
          <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>
            About PansGPT
          </Link>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
            Terms of Service
          </Link>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/usage" style={{ color: "inherit", textDecoration: "none" }}>
            Usage Policy
          </Link>
        </footer>
      </div>
    </div>
  );
}
