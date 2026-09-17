import Link from "next/link";

export default function HomePage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
          🌱 Greenfield Rebuild Phase 0
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">PansGPT 2.0</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Intelligent Pharmacy Education Platform. High-accuracy RAG monograph engine, real-time
          chemical drawer, and curriculum mastery system.
        </p>
        <div className="pt-4 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/app"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
          >
            Enter App &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
