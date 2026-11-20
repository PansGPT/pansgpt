"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "./rich-artifacts.css";
export function RichCard({
  title,
  label,
  icon,
  children,
  actions,
}: {
  title: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="chat-rich-card" aria-label={title}>
      <header className="chat-rich-header">
        <span className="chat-rich-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <span className="chat-rich-eyebrow">{label}</span>
          <h3>{title}</h3>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
export function RichDisclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="t-acc chat-rich-disclosure" data-open={open}>
      <button
        type="button"
        className="t-acc-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {label}
        <span className="t-acc-chevron">
          <ChevronDown size={15} />
        </span>
      </button>
      <div className="t-acc-panel" id={id} inert={!open}>
        <div className="t-acc-panel-inner">{children}</div>
      </div>
    </div>
  );
}
export function UnavailableArtifact({ title }: { title: string }) {
  return (
    <section className="chat-rich-card chat-rich-unavailable" aria-label={title}>
      <strong>{title}</strong>
      <p>This preview isn’t available. Ask PansGPT to create it again.</p>
    </section>
  );
}
