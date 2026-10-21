"use client";
import Link from "next/link";
import { ArrowUpRight, BookOpen, MessageSquare } from "lucide-react";
import { BrandMark } from "@/components/auth/brand-art";
import { useAuth } from "@/lib/auth-context";
import { destinations } from "@/components/shell/navigation";
export default function WorkspaceHome(): React.ReactElement {
  const { profile } = useAuth();
  return (
    <div className="workspace-home">
      <header className="workspace-greeting">
        <span className="shell-eyebrow">A little focus. A little progress.</span>
        <h1>Make yourself at home{profile?.first_name ? `, ${profile.first_name}` : ""}.</h1>
        <p>A space for your pharmacy studies, one session at a time.</p>
      </header>
      <section className="workspace-start" aria-labelledby="workspace-start-title">
        <div>
          <span className="shell-eyebrow">Your next study session</span>
          <h2 id="workspace-start-title">
            Start with a question.
            <br />
            Or open your library.
          </h2>
          <p>Pick up a concept, explore your course materials and keep moving forward.</p>
          <div className="workspace-start-actions">
            <Link href="/app/library">
              <BookOpen size={17} aria-hidden="true" />
              Open library
            </Link>
            <Link href="/app/chat">
              <MessageSquare size={17} aria-hidden="true" />
              Ask PansGPT
            </Link>
          </div>
        </div>
        <div className="workspace-start-mark" aria-hidden="true">
          <BrandMark />
        </div>
      </section>
      <section aria-labelledby="workspace-tools-title">
        <div className="workspace-section-heading">
          <h2 id="workspace-tools-title">Your study tools</h2>
          <span>Find your way around</span>
        </div>
        <div className="workspace-tool-grid">
          {destinations
            .filter((item) => item.href !== "/app")
            .map(({ href, label, description, icon: Icon }) => (
              <Link key={href} href={href} className="workspace-tool">
                <Icon size={23} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight size={17} aria-hidden="true" />
                {["Quiz", "Notes", "Focus"].includes(label) && <em>Coming soon</em>}
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
