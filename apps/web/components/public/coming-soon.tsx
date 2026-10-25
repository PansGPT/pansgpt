import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/auth/brand-art";
import "@pansgpt/ui/styles.css";
import "./coming-soon.css";

export function ComingSoon(): React.ReactElement {
  return (
    <main className="public-holding" data-theme="dark">
      <div className="public-holding-watermark" aria-hidden="true">
        <BrandMark />
      </div>
      <header className="public-holding-header">
        <Link href="/" className="public-holding-brand" aria-label="PansGPT home">
          <BrandMark />
          <span>PansGPT</span>
        </Link>
        <span className="public-holding-audience">Made for pharmacy students.</span>
      </header>
      <section className="public-holding-hero" aria-labelledby="public-holding-title">
        <div className="public-holding-notice">
          <span aria-hidden="true" />A new website is on the way
        </div>
        <h1 id="public-holding-title">
          Less overwhelm.<span>More understanding.</span>
        </h1>
        <p className="public-holding-description">
          We’re giving PansGPT a new home on the web.
          <br className="public-holding-desktop-break" /> Your study space is already here. Come on
          in.
        </p>
        <nav className="public-holding-actions" aria-label="Get started with PansGPT">
          <Link href="/signup" className="public-holding-button public-holding-button-primary">
            Sign up
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/login" className="public-holding-button public-holding-button-secondary">
            Log in
          </Link>
        </nav>
        <p className="public-holding-invitation">A little clarity goes a long way.</p>
      </section>
      <footer className="public-holding-footer">
        <span>© {new Date().getFullYear()} PansGPT</span>
        <span>Your next chapter starts with understanding.</span>
      </footer>
    </main>
  );
}
