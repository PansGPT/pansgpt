import Link from "next/link";
export default function WorkspaceNotFound(): React.ReactElement {
  return (
    <section className="shell-empty">
      <span className="shell-eyebrow">404</span>
      <h1>This page has moved out of reach</h1>
      <p>Find your way back to your study space.</p>
      <Link className="shell-primary-link" href="/app">
        Back to home
      </Link>
    </section>
  );
}
