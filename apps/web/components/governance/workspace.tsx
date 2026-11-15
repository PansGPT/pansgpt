"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input, ThemeProvider, useTheme } from "@pansgpt/ui/shell";
import type {
  GovernanceAction,
  GovernanceAnalytics,
  GovernanceIdentity,
  GovernanceRecord,
  GovernanceResource,
  GovernanceRole,
} from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { createGovernanceApi, type GovernanceAdapter } from "@/lib/governance-api";
import { actionText, defaults, formFields, label, resources, roleLabels } from "./config";
import { Button, Dialog, Empty, Failure, Select, Status } from "./primitives";
import { BatchEditor } from "./batch-editor";

type Remote<T> =
  { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };
const subscribeViewport = (notify: () => void): (() => void) => {
  const media = window.matchMedia("(max-width:760px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
function useRemote<T>(loader: (signal: AbortSignal) => Promise<T>, revision = 0): Remote<T> {
  const [snapshot, setSnapshot] = useState<{
    loader: typeof loader;
    revision: number;
    state: Remote<T>;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setSnapshot({ loader, revision, state: { status: "ready", data } });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setSnapshot({ loader, revision, state: { status: "error", error: errorText(error) } });
      });
    return () => controller.abort();
  }, [loader, revision]);
  return snapshot?.loader === loader && snapshot.revision === revision
    ? snapshot.state
    : { status: "loading" };
}
function baseFor(role: GovernanceRole): string {
  return role === "super_admin" ? "/super-admin" : role === "lecturer" ? "/lecturer" : "/admin";
}
function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
function display(key: string, value: string): string {
  if (!value) return "—";
  if (["start_time", "end_time", "expires_at", "reviewed_at"].includes(key) && value.includes("T"))
    return shortDate(value);
  if (["size_bytes", "storage_bytes", "max_storage_bytes"].includes(key))
    return `${(Number(value) / 1024 / 1024).toLocaleString("en-NG", { maximumFractionDigits: 1 })} MB`;
  if (value === "true") return "Enabled";
  if (value === "false") return "Disabled";
  return value;
}

/** The production entry never imports or falls back to demo data. */
export function GovernanceEntry({
  section = "overview",
  portal,
}: {
  section?: string;
  portal: "admin" | "super-admin" | "lecturer";
}): React.ReactElement {
  const { session, profile, loading, profileError } = useAuth();
  const accessToken = session?.access_token;
  const adapter = useMemo(
    () => (accessToken ? createGovernanceApi(accessToken) : null),
    [accessToken]
  );
  if (loading)
    return (
      <div className="gov-gate" role="status">
        Verifying your workspace…
      </div>
    );
  if (!adapter || !profile)
    return (
      <div className="gov-gate">
        <h1>{profileError ? "Access could not be verified" : "Sign in to continue"}</h1>
        <p>Your administrative workspace requires a verified account.</p>
        <Link href={`/login?next=/${portal}`}>Go to sign in</Link>
      </div>
    );
  return (
    <GovernanceWorkspace
      key={`${profile.id}:${profile.university_id}:${session?.access_token}`}
      adapter={adapter}
      section={section}
      portal={portal}
    />
  );
}
export function GovernanceWorkspace(props: {
  adapter: GovernanceAdapter;
  section?: string;
  portal?: string;
  demo?: boolean;
}): React.ReactElement {
  return (
    <ThemeProvider>
      <Workspace {...props} />
    </ThemeProvider>
  );
}

function Workspace({
  adapter,
  section = "overview",
  portal,
  demo = false,
}: {
  adapter: GovernanceAdapter;
  section?: string;
  portal?: string;
  demo?: boolean;
}): React.ReactElement {
  const [revision, setRevision] = useState(0);
  const load = useCallback((signal: AbortSignal) => adapter.identity(signal), [adapter]);
  const identity = useRemote(load, revision);
  const [mobile, setMobile] = useState(false);
  const small = useSyncExternalStore(
    subscribeViewport,
    () => window.matchMedia("(max-width:760px)").matches,
    () => false
  );
  const navigation = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!mobile || !small || !navigation.current) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = navigation.current;
    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),select")
      ).filter((node) => node.getClientRects().length > 0);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = oldOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [mobile, small]);
  const query = useSearchParams();
  const scope = query.get("university_id") ?? "";
  const { theme, setTheme } = useTheme();
  if (identity.status === "loading")
    return (
      <div className="gov-gate" role="status">
        Opening your workspace…
      </div>
    );
  if (identity.status === "error")
    return (
      <div className="gov-gate">
        <Failure error={identity.error} retry={() => setRevision((v) => v + 1)} />
        <Link href="/app">Return to your study workspace</Link>
      </div>
    );
  const actor = identity.data;
  const base = demo ? "/admin-preview" : baseFor(actor.role);
  if (!demo && portal && base !== `/${portal}`)
    return (
      <div className="gov-gate">
        <h1>Your workspace is ready</h1>
        <p>{roleLabels[actor.role]}</p>
        <Link href={base}>Open your workspace</Link>
      </div>
    );
  const permitted =
    section === "overview" ||
    section === "help" ||
    (section === "analytics" && actor.role !== "lecturer") ||
    actor.resources.includes(section as GovernanceResource);
  const title =
    section === "overview"
      ? "Overview"
      : section === "analytics"
        ? "AI usage"
        : section === "help"
          ? "Help & guidance"
          : (resources[section as GovernanceResource]?.title ?? "Page not found");
  const navHref = (name: string) => {
    const next = new URLSearchParams();
    if (scope) next.set("university_id", scope);
    if (demo) next.set("role", actor.role);
    return `${base}${name === "overview" ? "" : "/" + name}${next.size ? `?${next}` : ""}`;
  };
  const groups = [
    {
      name: "Workspace",
      items: [
        "overview",
        ...actor.resources.filter((r) =>
          ["universities", "students", "lecturers", "administrators", "invitations"].includes(r)
        ),
      ],
    },
    {
      name: "Academic operations",
      items: actor.resources.filter((r) =>
        ["materials", "timetable", "exams", "restrictions", "knowledge", "terms"].includes(r)
      ),
    },
    {
      name: "Management",
      items: [
        ...(actor.role !== "lecturer" ? ["analytics"] : []),
        ...actor.resources.filter((r) => ["support", "audit", "settings"].includes(r)),
        "help",
      ],
    },
  ];
  return (
    <div className="gov-shell">
      <a className="gov-skip" href="#governance-main">
        Skip to content
      </a>
      <aside
        ref={navigation}
        id="gov-navigation"
        className="gov-sidebar"
        data-open={mobile || undefined}
        inert={small && !mobile}
        role={small && mobile ? "dialog" : undefined}
        aria-label={small ? "Workspace navigation" : undefined}
        aria-modal={(small && mobile) || undefined}
      >
        <Link className="gov-brand" href={navHref("overview")} onClick={() => setMobile(false)}>
          Pans<span>GPT</span>
          <small>Administration</small>
        </Link>
        <div className="gov-workspace-label">
          <span className="gov-monogram">
            {actor.role === "super_admin" ? "P" : actor.university_name.slice(0, 1)}
          </span>
          <div>
            <strong>
              {actor.role === "super_admin" ? "Platform workspace" : actor.university_name}
            </strong>
            <small>{roleLabels[actor.role]}</small>
          </div>
        </div>
        <nav aria-label="Administrative navigation">
          {groups.map((group) => (
            <div className="gov-nav-group" key={group.name}>
              <p>{group.name}</p>
              {group.items.map((name) => (
                <Link
                  key={name}
                  href={navHref(name)}
                  aria-current={name === section ? "page" : undefined}
                  onClick={() => setMobile(false)}
                >
                  {name === "overview"
                    ? "Overview"
                    : name === "analytics"
                      ? "AI usage"
                      : name === "help"
                        ? "Help & guidance"
                        : resources[name as GovernanceResource].title}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="gov-sidebar-bottom">
          <Select
            label="Appearance"
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "sepia")}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="sepia">Sepia</option>
          </Select>
          <Link href="/app">
            Back to study workspace <span aria-hidden="true">↗</span>
          </Link>
          <div className="gov-account">
            <span className="gov-avatar">{actor.name.slice(0, 1)}</span>
            <div>
              <strong>{actor.name}</strong>
              <small>{roleLabels[actor.role]}</small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="gov-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="gov-main-wrap">
        <header className="gov-topbar">
          <button
            className="gov-mobile-menu"
            aria-expanded={mobile}
            aria-controls="gov-navigation"
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? "Close" : "Menu"}
          </button>
          <div className="gov-breadcrumb">
            Workspace <span aria-hidden="true">/</span>
            <strong>{title}</strong>
          </div>
          <div className="gov-topbar-end">
            {demo ? (
              <span className="gov-demo">Sample workspace · Changes reset on refresh</span>
            ) : (
              <span className="gov-session">
                {actor.role === "super_admin" ? "Platform access" : "University access"}
              </span>
            )}
          </div>
        </header>
        <main id="governance-main" className="gov-main" tabIndex={-1}>
          {actor.role === "super_admin" && (
            <ScopeSelector adapter={adapter} base={base} section={section} scope={scope} />
          )}
          <div className="gov-page-heading">
            <div>
              <p className="gov-eyebrow">
                {actor.role === "lecturer"
                  ? "Faculty workspace"
                  : scope
                    ? "University workspace"
                    : actor.role === "super_admin"
                      ? "Platform workspace"
                      : actor.university_name}
              </p>
              <h1>{title}</h1>
              <p>
                {section === "overview"
                  ? "A clear view of what needs your attention today."
                  : section === "analytics"
                    ? "Understand AI activity across the last 30 days."
                    : section === "help"
                      ? "Practical answers for the work you do every day."
                      : resources[section as GovernanceResource]?.description}
              </p>
            </div>
            {section === "overview" && (
              <Link className="gov-overview-help" href={navHref("help")}>
                Workspace guide
              </Link>
            )}
          </div>
          {!permitted ? (
            <Empty
              title="This page isn’t available"
              description="Choose a section from your workspace navigation."
              action={<Link href={navHref("overview")}>Return to overview</Link>}
            />
          ) : section === "overview" ? (
            <Overview key={scope} adapter={adapter} actor={actor} scope={scope} href={navHref} />
          ) : section === "analytics" ? (
            <Analytics key={scope} adapter={adapter} scope={scope} />
          ) : section === "help" ? (
            <Help />
          ) : (
            <Directory
              key={`${section}:${scope}:${query.get("search") ?? ""}:${query.get("status") ?? ""}:${query.get("page") ?? ""}`}
              resource={section as GovernanceResource}
              adapter={adapter}
              actor={actor}
              scope={scope}
            />
          )}
        </main>
        <footer className="gov-footer">
          <span>PansGPT · A better place to learn.</span>
          <span>{roleLabels[actor.role]}</span>
        </footer>
      </div>
    </div>
  );
}

function ScopeSelector({
  adapter,
  base,
  section,
  scope,
}: {
  adapter: GovernanceAdapter;
  base: string;
  section: string;
  scope: string;
}): React.ReactElement {
  const [search, setSearch] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const navigationQuery = useSearchParams();
  const picker = useRef<HTMLDetailsElement | null>(null);
  const selectScope = (id: string) => {
    const next = new URLSearchParams();
    if (id) next.set("university_id", id);
    const role = navigationQuery.get("role");
    if (base === "/admin-preview" && role) next.set("role", role);
    if (picker.current) picker.current.open = false;
    router.push(`${base}/${section}${next.size ? "?" + next.toString() : ""}`);
  };
  const loader = useCallback(
    (signal: AbortSignal) =>
      adapter.list("universities", new URLSearchParams({ search, page: String(page) }), signal),
    [adapter, search, page]
  );
  const data = useRemote(loader);
  return (
    <details ref={picker} className="gov-scope">
      <summary>
        {scope ? "University selected" : "All universities"}
        <span>Change scope</span>
      </summary>
      <div className="gov-scope-picker">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchValue);
          }}
        >
          <Input
            label="Find a university"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Find
          </Button>
        </form>
        <button onClick={() => selectScope("")}>All universities</button>
        {data.status === "ready" ? (
          data.data.items.map((item) => (
            <button
              key={item.id}
              aria-pressed={scope === item.id}
              onClick={() => selectScope(item.id)}
            >
              {item.title}
            </button>
          ))
        ) : (
          <p role="status">{data.status === "loading" ? "Loading universities…" : data.error}</p>
        )}
        {data.status === "ready" && data.data.total > 20 && (
          <div className="gov-pagination">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="secondary"
              disabled={page * 20 >= data.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}

function Overview({
  adapter,
  actor,
  scope,
  href,
}: {
  adapter: GovernanceAdapter;
  actor: GovernanceIdentity;
  scope: string;
  href: (name: string) => string;
}): React.ReactElement {
  const [revision, setRevision] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const q = (status = "") =>
        new URLSearchParams({ ...(scope ? { university_id: scope } : {}), status });
      const [pending, active, restrictions, activity] = await Promise.all([
        adapter.list("materials", q("pending_review"), signal),
        adapter.list("materials", q("active"), signal),
        adapter.list("restrictions", q("active"), signal),
        actor.resources.includes("audit")
          ? adapter.list("audit", q(), signal)
          : adapter.list("support", q("open"), signal),
      ]);
      return { pending, active, restrictions, activity };
    },
    [adapter, actor.resources, scope]
  );
  const state = useRemote(load, revision);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error")
    return <Failure error={state.error} retry={() => setRevision((v) => v + 1)} />;
  const { pending, active, restrictions, activity } = state.data;
  const faculty = actor.role === "lecturer";
  const filtered = (resource: string, key: string, value: string): string =>
    `${href(resource)}${href(resource).includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
  const reviewLink = filtered("materials", "status", "pending_review");
  const shortcutOptions: { resource: GovernanceResource; title: string; description: string }[] = [
    {
      resource: "universities",
      title: "Universities",
      description: "Institution access and allocations",
    },
    {
      resource: "students",
      title: "Student access",
      description: "Accounts, levels and subscriptions",
    },
    {
      resource: "timetable",
      title: "Academic schedules",
      description: "Classes and examination planning",
    },
    {
      resource: "restrictions",
      title: "Exam restrictions",
      description: "Manage scheduled AI lockouts",
    },
    {
      resource: "knowledge",
      title: "Course knowledge",
      description: "Keep shared curriculum up to date",
    },
    {
      resource: "support",
      title: "Support inbox",
      description: faculty
        ? "Get help from your institution"
        : "Respond to requests and follow-ups",
    },
  ];
  const shortcuts = shortcutOptions
    .filter((item) => actor.resources.includes(item.resource))
    .slice(0, 3);
  const activityTitle = (value: string): string => {
    const [resource = "", action] = value.split(".");
    if (!action) return value;
    const verbs: Record<string, string> = {
      create: "created",
      update: "updated",
      approve: "approved",
      reject: "rejected",
      suspend: "suspended",
      activate: "activated",
      delete: "deleted",
      restore: "restored",
      cancel: "cancelled",
      reply: "replied to",
      retry: "retried",
      resubmit: "resubmitted",
      accept: "accepted",
    };
    const config = resources[resource as GovernanceResource];
    return `${config ? label(config.singular) : label(resource)} ${verbs[action] ?? label(action).toLowerCase()}`;
  };
  return (
    <div className="gov-overview">
      <section className="gov-priority" aria-labelledby="overview-priority">
        <div className="gov-priority-copy">
          <span className="gov-priority-label">
            {faculty ? "Your teaching workspace" : "Your next priority"}
          </span>
          <h2 id="overview-priority">
            {pending.total
              ? faculty
                ? `${pending.total} submission${pending.total === 1 ? " is" : "s are"} awaiting review.`
                : `${pending.total} material${pending.total === 1 ? " needs" : "s need"} your review.`
              : faculty
                ? "Ready for your next contribution."
                : "Your review queue is clear."}
          </h2>
          <p>
            {faculty
              ? "Follow your submissions, read feedback and keep your course materials moving."
              : pending.total
                ? "Help students get the materials they need. Start with the pending submissions below."
                : "Keep the momentum going. Check your academic schedules or update shared course knowledge."}
          </p>
          <Link
            className="gov-primary-link"
            href={faculty || !pending.total ? href("materials") : reviewLink}
          >
            {faculty
              ? "Open your submissions"
              : pending.total
                ? "Review submissions"
                : "Open materials"}
          </Link>
          <button
            className="gov-overview-refresh"
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Refresh overview
          </button>
        </div>
        <div className="gov-priority-summary">
          <span>{faculty ? "Pending submissions" : "Pending decisions"}</span>
          <strong>{pending.total.toLocaleString()}</strong>
          <span>{faculty ? "Your submitted materials" : "In the selected workspace"}</span>
        </div>
      </section>
      <div className="gov-overview-totals" aria-label="Workspace totals">
        {[
          {
            label: faculty ? "Open support requests" : "Recorded changes",
            value: activity.total,
            note: faculty ? "Requests awaiting follow-up" : "Your workspace activity log",
            href: href(faculty ? "support" : "audit"),
          },
          {
            label: "Approved materials",
            value: active.total,
            note: "Approved for your library",
            href: href("materials") + `${href("materials").includes("?") ? "&" : "?"}status=active`,
          },
          {
            label: "Active restrictions",
            value: restrictions.total,
            note: "Assessment windows in progress",
            href: href("restrictions"),
          },
        ].map((metric) => (
          <Link href={metric.href} key={metric.label} className="gov-metric">
            <span>{metric.label}</span>
            <strong>{metric.value.toLocaleString()}</strong>
            <small>{metric.note}</small>
          </Link>
        ))}
      </div>
      <div className="gov-overview-grid gov-overview-content">
        <section className="gov-panel gov-queue">
          <div className="gov-panel-heading">
            <div>
              <h2>
                {faculty ? "Your pending submissions" : "Submission queue"}
                <span className="gov-count">{pending.total}</span>
              </h2>
              <p>
                {pending.total
                  ? faculty
                    ? "Track the materials your institution is reviewing."
                    : "Open a submission to inspect the file and record a decision."
                  : "You’re up to date with submissions."}
              </p>
            </div>
            <Link href={reviewLink}>View queue</Link>
          </div>
          {pending.items.length ? (
            <div className="gov-review-list gov-overview-queue">
              {pending.items.slice(0, 5).map((item) => (
                <Link
                  href={
                    href("materials") +
                    `${href("materials").includes("?") ? "&" : "?"}search=${encodeURIComponent(item.title)}`
                  }
                  key={item.id}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.subtitle} · {item.fields.target_level || "All"} level
                    </span>
                  </div>
                  <div className="gov-queue-action">
                    <time dateTime={item.updated_at}>{shortDate(item.updated_at)}</time>
                    <span>
                      {faculty ? "View submission" : "Review material"}
                      <span aria-hidden="true"> →</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Nothing waiting here"
              description="New submissions will appear here when they’re ready."
            />
          )}
        </section>
        <div className="gov-overview-aside">
          <section className="gov-panel gov-shortcuts" aria-labelledby="overview-shortcuts">
            <div className="gov-panel-heading">
              <div>
                <h2 id="overview-shortcuts">Workspace shortcuts</h2>
                <p>The essentials, one step away.</p>
              </div>
            </div>
            {shortcuts.map((item) => (
              <Link key={item.resource} href={href(item.resource)}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </section>
          <section className="gov-panel gov-overview-history">
            <div className="gov-panel-heading">
              <div>
                <h2>{actor.role === "lecturer" ? "Support requests" : "Recent activity"}</h2>
                <p>
                  {actor.role === "lecturer"
                    ? "Your open requests and follow-ups."
                    : "The latest changes in your workspace."}
                </p>
              </div>
              <Link href={href(actor.resources.includes("audit") ? "audit" : "support")}>
                View all
              </Link>
            </div>
            {activity.items.length ? (
              <ol className="gov-activity">
                {activity.items.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <span className="gov-activity-dot" aria-hidden="true" />
                    <div>
                      <strong>{faculty ? item.title : activityTitle(item.title)}</strong>
                      <p>{item.subtitle}</p>
                      <time dateTime={item.updated_at}>{shortDate(item.updated_at)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty
                title="A fresh start"
                description="Workspace activity will appear here as changes are made."
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Analytics({
  adapter,
  scope,
}: {
  adapter: GovernanceAdapter;
  scope: string;
}): React.ReactElement {
  const [revision, setRevision] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) =>
      adapter.analytics(new URLSearchParams(scope ? { university_id: scope } : {}), signal),
    [adapter, scope]
  );
  const state = useRemote<GovernanceAnalytics>(load, revision);
  if (state.status === "loading") return <Loading />;
  if (state.status === "error")
    return <Failure error={state.error} retry={() => setRevision((v) => v + 1)} />;
  const data = state.data;
  const max = Math.max(1, ...data.daily.map((day) => day.requests));
  return (
    <>
      <div className="gov-metrics" data-four>
        {data.metrics.map((metric) => (
          <div key={metric.label} className="gov-metric">
            <span>{metric.label}</span>
            <strong>{metric.value.toLocaleString()}</strong>
            <small>{metric.unit} · Last 30 days</small>
          </div>
        ))}
      </div>
      <section className="gov-panel">
        <div className="gov-panel-heading">
          <div>
            <h2>Daily AI activity</h2>
            <p>
              Requests recorded by the platform. Cost estimates are unavailable until provider
              pricing is configured.
            </p>
          </div>
        </div>
        {data.daily.length ? (
          <>
            <div
              className="gov-chart"
              role="img"
              aria-label={`AI requests over ${data.daily.length} recorded days; ${data.daily.reduce((s, d) => s + d.requests, 0).toLocaleString()} total requests.`}
            >
              {data.daily.map((day) => (
                <div key={day.date} title={`${day.date}: ${day.requests} requests`}>
                  <div style={{ height: `${Math.max(2, (day.requests / max) * 100)}%` }} />
                  <span>{new Date(day.date + "T12:00:00").getDate()}</span>
                </div>
              ))}
            </div>
            <details className="gov-chart-data">
              <summary>View daily data</summary>
              <div className="gov-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Requests</th>
                      <th>Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{day.requests}</td>
                        <td>{day.tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <Empty
            title="No AI activity yet"
            description="Usage will appear after requests have been recorded."
          />
        )}
      </section>
      <section className="gov-panel">
        <div className="gov-panel-heading">
          <div>
            <h2>Provider performance</h2>
            <p>Measured requests, tokens and latency.</p>
          </div>
        </div>
        <div className="gov-table-wrap">
          <table>
            <caption className="gov-sr-only">AI provider performance in the last 30 days</caption>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Requests</th>
                <th scope="col">Tokens</th>
                <th scope="col">Average latency</th>
                <th scope="col">Failures</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map((provider) => (
                <tr key={provider.provider}>
                  <th scope="row">{label(provider.provider)}</th>
                  <td>{provider.requests.toLocaleString()}</td>
                  <td>{provider.tokens.toLocaleString()}</td>
                  <td>{Math.round(provider.latency_ms)} ms</td>
                  <td>{provider.failures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Directory({
  resource,
  adapter,
  actor,
  scope,
}: {
  resource: GovernanceResource;
  adapter: GovernanceAdapter;
  actor: GovernanceIdentity;
  scope: string;
}): React.ReactElement {
  const query = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.get("search") ?? "");
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<GovernanceRecord | null>(null);
  const [editing, setEditing] = useState<{
    action: GovernanceAction;
    row?: GovernanceRecord;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Map<string, GovernanceRecord>>(new Map());
  const [batch, setBatch] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const downloadController = useRef<AbortController | null>(null);
  useEffect(() => () => downloadController.current?.abort(), []);
  async function downloadMaterial(row: GovernanceRecord): Promise<void> {
    if (downloading) return;
    setDownloading(true);
    setDownloadError("");
    downloadController.current = new AbortController();
    try {
      const { blob, filename } = await adapter.download(
        row.id,
        new URLSearchParams(scope ? { university_id: scope } : {}),
        downloadController.current.signal
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      if (!downloadController.current.signal.aborted) setDownloadError(errorText(error));
    } finally {
      setDownloading(false);
    }
  }
  const pageNumber = Math.max(1, Number(query.get("page")) || 1);
  const filter = query.get("status") ?? "";
  const searchTerm = query.get("search") ?? "";
  const params = useMemo(
    () =>
      new URLSearchParams({
        ...(scope ? { university_id: scope } : {}),
        search: searchTerm,
        status: filter,
        page: String(pageNumber),
      }),
    [scope, searchTerm, filter, pageNumber]
  );
  const load = useCallback(
    (signal: AbortSignal) => adapter.list(resource, params, signal),
    [adapter, resource, params]
  );
  const state = useRemote(load, revision);
  const config = resources[resource];
  const updateQuery = (changes: Record<string, string>) => {
    const next = new URLSearchParams(query.toString());
    for (const [k, v] of Object.entries(changes))
      if (v) next.set(k, v);
      else next.delete(k);
    router.replace(`${pathname}?${next}`, { scroll: false });
    setDetail(null);
    setSelected(new Map());
  };
  const canCreate =
    Boolean(config.create) &&
    !(resource === "terms" && state.status === "ready" && state.data.total > 0);
  const needsScope =
    actor.role === "super_admin" && !scope && !["universities", "settings"].includes(resource);
  const saved = (message: string) => {
    setBatch(false);
    setSelected(new Map());
    setEditing(null);
    setDetail(null);
    setNotice(message);
    setRevision((v) => v + 1);
  };
  return (
    <>
      <div className="gov-directory-toolbar">
        <form
          className="gov-search"
          onSubmit={(e) => {
            e.preventDefault();
            updateQuery({ search, page: "" });
          }}
        >
          <Input
            label={`Search ${config.title.toLowerCase()}`}
            placeholder={`Search ${config.title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={150}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="gov-directory-actions">
          <Select
            label="Status"
            value={filter}
            onChange={(e) => updateQuery({ status: e.target.value, page: "" })}
          >
            <option value="">All statuses</option>
            {config.statuses.map((status) => (
              <option value={status} key={status}>
                {label(status)}
              </option>
            ))}
          </Select>
          {canCreate && (
            <Button
              onClick={() =>
                setEditing({
                  action: "create",
                  row:
                    resource === "settings" && state.status === "ready"
                      ? state.data.items.find((row) => row.status === "active")
                      : undefined,
                })
              }
              disabled={needsScope}
            >
              {config.create}
            </Button>
          )}
        </div>
      </div>
      {needsScope && (
        <p className="gov-inline-note">Choose a university above to add or change records.</p>
      )}
      {selected.size > 0 && (
        <div className="gov-selection">
          <span>
            {selected.size} student{selected.size === 1 ? "" : "s"} selected
          </span>
          <div>
            <Button variant="secondary" onClick={() => setSelected(new Map())}>
              Clear selection
            </Button>
            <Button disabled={needsScope} onClick={() => setBatch(true)}>
              Update selected
            </Button>
          </div>
        </div>
      )}
      {notice && (
        <div className="gov-notice" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {state.status === "loading" ? (
        <Loading />
      ) : state.status === "error" ? (
        <Failure error={state.error} retry={() => setRevision((v) => v + 1)} />
      ) : (
        <section className="gov-panel">
          <div className="gov-panel-heading">
            <div>
              <h2>
                {config.title}{" "}
                <span className="gov-count">{state.data.total.toLocaleString()}</span>
              </h2>
              <p>
                {filter || searchTerm
                  ? "Showing matching records."
                  : resource === "materials"
                    ? "Approval and processing are tracked separately."
                    : "Records available in your current workspace."}
              </p>
            </div>
            <Button variant="tertiary" onClick={() => setRevision((v) => v + 1)}>
              Refresh
            </Button>
          </div>
          {state.data.items.length ? (
            <>
              <div
                className="gov-table-wrap"
                tabIndex={0}
                role="region"
                aria-label={`${config.title} table`}
              >
                <table>
                  <caption className="gov-sr-only">
                    {config.title} in your current workspace
                  </caption>
                  <thead>
                    <tr>
                      {resource === "students" && (
                        <th scope="col">
                          <input
                            type="checkbox"
                            aria-label="Select all students on this page"
                            checked={state.data.items
                              .filter((row) => row.actions.includes("update"))
                              .every((row) => selected.has(row.id))}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? new Map(
                                      state.data.items
                                        .filter((row) => row.actions.includes("update"))
                                        .map((row) => [row.id, row])
                                    )
                                  : new Map()
                              )
                            }
                          />
                        </th>
                      )}
                      <th scope="col">
                        {resource === "audit"
                          ? "Event"
                          : resource === "support"
                            ? "Request"
                            : "Name"}
                      </th>
                      <th scope="col">Status</th>
                      {config.columns.map((col) => (
                        <th scope="col" key={col.key}>
                          {col.label}
                        </th>
                      ))}
                      <th scope="col">Updated</th>
                      <th scope="col">
                        <span className="gov-sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.items.map((row) => (
                      <tr key={row.id}>
                        {resource === "students" && (
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.title}`}
                              disabled={!row.actions.includes("update")}
                              checked={selected.has(row.id)}
                              onChange={(e) =>
                                setSelected((current) => {
                                  const next = new Map(current);
                                  if (e.target.checked) next.set(row.id, row);
                                  else next.delete(row.id);
                                  return next;
                                })
                              }
                            />
                          </td>
                        )}
                        <th scope="row">
                          <button className="gov-row-title" onClick={() => setDetail(row)}>
                            {row.title}
                          </button>
                          <span className="gov-row-subtitle">{row.subtitle}</span>
                        </th>
                        <td>
                          <Status value={row.status} />
                        </td>
                        {config.columns.map((col) => (
                          <td key={col.key}>{display(col.key, row.fields[col.key] ?? "")}</td>
                        ))}
                        <td className="gov-nowrap">
                          <time dateTime={row.updated_at}>{shortDate(row.updated_at)}</time>
                        </td>
                        <td>
                          <button
                            className="gov-text-button"
                            onClick={() => setDetail(row)}
                            aria-label={`View ${row.title}`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="gov-pagination">
                <span>
                  {(pageNumber - 1) * 20 + 1}–{Math.min(pageNumber * 20, state.data.total)} of{" "}
                  {state.data.total} records
                </span>
                <div>
                  <Button
                    variant="secondary"
                    disabled={pageNumber <= 1}
                    onClick={() => updateQuery({ page: String(pageNumber - 1) })}
                  >
                    Previous
                  </Button>
                  <span aria-live="polite">Page {pageNumber}</span>
                  <Button
                    variant="secondary"
                    disabled={pageNumber * 20 >= state.data.total}
                    onClick={() => updateQuery({ page: String(pageNumber + 1) })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Empty
              title={
                pageNumber > 1 && state.data.total > 0
                  ? "No records on this page"
                  : searchTerm || filter
                    ? "No matching records"
                    : `No ${config.title.toLowerCase()} yet`
              }
              description={
                pageNumber > 1 && state.data.total > 0
                  ? "The directory has changed. Return to the first page."
                  : searchTerm || filter
                    ? "Try another search or clear the filters."
                    : `New ${config.title.toLowerCase()} will appear here when added.`
              }
              action={
                pageNumber > 1 ? (
                  <Button variant="secondary" onClick={() => updateQuery({ page: "" })}>
                    Return to first page
                  </Button>
                ) : searchTerm || filter ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      updateQuery({ search: "", status: "", page: "" });
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}
        </section>
      )}
      {detail && (
        <Dialog
          title={detail.title}
          description={detail.subtitle || config.title}
          close={() => setDetail(null)}
          wide
        >
          <div className="gov-detail-summary">
            <Status value={detail.status} />
            <time dateTime={detail.updated_at}>Updated {shortDate(detail.updated_at)}</time>
          </div>
          {resource === "materials" && detail.status !== "deleted" && (
            <div className="gov-download">
              <Button
                variant="secondary"
                loading={downloading}
                loadingText="Preparing file…"
                onClick={() => {
                  void downloadMaterial(detail);
                }}
              >
                Download material
              </Button>
              {downloadError && (
                <p className="gov-form-error" role="alert">
                  {downloadError}
                </p>
              )}
            </div>
          )}
          <dl className="gov-detail-fields">
            {Object.entries(detail.fields)
              .filter(
                ([key, value]) => value && !["uploaded_by", "user_id", "created_by"].includes(key)
              )
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{label(key)}</dt>
                  <dd>{display(key, value)}</dd>
                </div>
              ))}
            <div>
              <dt>Record ID</dt>
              <dd>{detail.id}</dd>
            </div>
          </dl>
          {detail.actions.length > 0 && (
            <div className="gov-dialog-actions">
              {detail.actions.map((action) => (
                <Button
                  key={action}
                  variant={action === "approve" ? "primary" : "secondary"}
                  destructive={["delete", "reject", "suspend"].includes(action)}
                  disabled={needsScope}
                  onClick={() => {
                    setDetail(null);
                    setEditing({ action, row: detail });
                  }}
                >
                  {actionText(resource, action)}
                </Button>
              ))}
            </div>
          )}
        </Dialog>
      )}
      {editing && (
        <Editor
          resource={resource}
          action={editing.action}
          row={editing.row}
          adapter={adapter}
          actor={actor}
          scope={scope}
          close={() => setEditing(null)}
          saved={saved}
        />
      )}
      {batch && (
        <BatchEditor
          rows={[...selected.values()]}
          adapter={adapter}
          scope={scope}
          close={() => setBatch(false)}
          saved={saved}
        />
      )}
    </>
  );
}

function Editor({
  resource,
  action,
  row,
  adapter,
  actor,
  scope,
  close,
  saved,
}: {
  resource: GovernanceResource;
  action: GovernanceAction;
  row?: GovernanceRecord;
  adapter: GovernanceAdapter;
  actor: GovernanceIdentity;
  scope: string;
  close: () => void;
  saved: (message: string) => void;
}): React.ReactElement {
  const fields = formFields(resource, action, actor.role);
  const initial = { ...defaults(resource), ...row?.fields };
  if (resource === "universities" && row) initial.status = row.status;
  if (resource === "universities")
    initial.max_storage_bytes = String(Number(initial.max_storage_bytes) / 1024 ** 3);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? ""]))
  );
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const uploading = resource === "materials" && (action === "create" || action === "resubmit");
  const destructive = ["delete", "suspend", "archive", "reject", "cancel"].includes(action);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    if (resource === "universities" && action === "create" && !reviewing) {
      setError("");
      setReviewing(true);
      return;
    }
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      if (uploading) {
        if (!file) throw new Error("Choose a file to upload.");
        const id =
          uploadId ??
          (await adapter.upload(
            file,
            { ...values, ...(scope ? { university_id: scope } : {}) },
            controller.current.signal
          ));
        setUploadId(id);
        if (action === "resubmit" && row) {
          await adapter.mutate(
            "materials",
            new URLSearchParams(scope ? { university_id: scope } : {}),
            {
              action: "resubmit",
              id: row.id,
              expected_version: row.updated_at,
              reason: reason.trim(),
              fields: { replacement_id: id },
            },
            controller.current.signal
          );
        }
        saved(
          `Material uploaded. ${actor.role === "lecturer" ? "Your submission is awaiting review." : "Processing will continue in the background."}`
        );
      } else {
        const data = { ...values };
        if (resource === "universities" && data.max_storage_bytes)
          data.max_storage_bytes = String(Math.round(Number(data.max_storage_bytes) * 1024 ** 3));
        for (const field of fields)
          if (field.type === "datetime-local" && data[field.key])
            data[field.key] = new Date(data[field.key]).toISOString();
        for (const field of fields) if (field.optional && !data[field.key]) delete data[field.key];
        const result = await adapter.mutate(
          resource,
          new URLSearchParams(scope ? { university_id: scope } : {}),
          {
            action,
            ...(row && action !== "create" ? { id: row.id, expected_version: row.updated_at } : {}),
            reason: reason.trim(),
            fields: data,
          },
          controller.current.signal
        );
        if (result.invite_url) setInvitation(result.invite_url);
        else saved(result.message);
      }
    } catch (error) {
      if (!controller.current.signal.aborted) setError(errorText(error));
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  const title =
    action === "create"
      ? (resources[resource].create ?? "Add record")
      : `${actionText(resource, action)}${row ? ": " + row.title : ""}`;
  if (invitation)
    return (
      <Dialog
        title="Invitation ready"
        description="Share this link with the invited person. It expires in seven days and can be accepted only with the specified email address."
        close={() => saved("Invitation created.")}
      >
        <Input
          label="Invitation link"
          value={invitation}
          readOnly
          onFocus={(event) => event.target.select()}
        />
        {error && (
          <p className="gov-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="gov-dialog-actions">
          <Button
            variant="secondary"
            onClick={() => {
              if (!navigator.clipboard) {
                setError("Select and copy the invitation link above.");
                return;
              }
              void navigator.clipboard
                .writeText(invitation)
                .then(() => setCopied(true))
                .catch(() => setError("Select and copy the invitation link above."));
            }}
          >
            {copied ? "Copied" : "Copy invitation"}
          </Button>
          <Button
            onClick={() => saved("Invitation created. Share the link with the invited person.")}
          >
            Done
          </Button>
        </div>
      </Dialog>
    );
  return (
    <Dialog
      title={reviewing ? "Review university setup" : title}
      description={
        destructive
          ? "Review the record and explain this change before continuing."
          : resource === "settings"
            ? "Changes take effect only after a different platform administrator approves them."
            : uploading
              ? "Add the course details and choose a PDF, Word or PowerPoint file."
              : "Complete the details below. Every change is recorded in the activity log."
      }
      close={close}
      busy={busy}
      wide={fields.length > 4}
    >
      <form onSubmit={submit}>
        {reviewing && (
          <dl className="gov-detail-fields">
            {fields.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  {field.key === "max_storage_bytes"
                    ? `${values[field.key]} GiB`
                    : values[field.key] || "—"}
                </dd>
              </div>
            ))}
            <div>
              <dt>Reason</dt>
              <dd>{reason}</dd>
            </div>
          </dl>
        )}
        <fieldset hidden={reviewing} disabled={busy} className="gov-form-fields">
          {fields.map((field) => (
            <div
              className={field.type === "textarea" ? "gov-field-wide" : undefined}
              key={field.key}
            >
              {field.type === "select" ? (
                <Select
                  label={field.label}
                  value={values[field.key] ?? ""}
                  required={!field.optional}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                >
                  {field.options?.map((value) => (
                    <option key={value} value={value}>
                      {field.key === "is_internal_note"
                        ? value === "true"
                          ? "Internal note"
                          : "Visible to requester"
                        : value === "true"
                          ? "Enabled"
                          : value === "false"
                            ? "Disabled"
                            : label(value)}
                    </option>
                  ))}
                </Select>
              ) : field.type === "textarea" ? (
                <label className="gov-field">
                  <span>{field.label}</span>
                  <textarea
                    required={!field.optional}
                    value={values[field.key] ?? ""}
                    maxLength={16000}
                    rows={6}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                </label>
              ) : (
                <Input
                  label={field.label}
                  type={field.type ?? "text"}
                  required={!field.optional}
                  value={values[field.key] ?? ""}
                  min={field.type === "number" ? 0 : undefined}
                  step={field.type === "number" ? "any" : undefined}
                  maxLength={field.type === "number" ? undefined : 255}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              )}
              {field.hint && <p className="gov-field-hint">{field.hint}</p>}
            </div>
          ))}
          {uploading && (
            <label className="gov-file-field gov-field-wide">
              <strong>{file ? file.name : "Choose a course material"}</strong>
              <span>PDF, DOC, DOCX, PPT or PPTX · Up to 50 MB</span>
              <input
                aria-label="Material file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {(!uploading || action === "resubmit") && (
            <label className="gov-field gov-field-wide">
              <span>
                {action === "reply" ? "Context for the activity log" : "Reason for this change"}
              </span>
              <textarea
                value={reason}
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                placeholder={
                  action === "reject"
                    ? "Explain what needs to be corrected…"
                    : "Briefly explain the purpose of this change…"
                }
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          {action === "delete" && (
            <p className="gov-inline-note gov-field-wide">
              {["students", "lecturers", "administrators", "materials"].includes(resource)
                ? "The record can be recovered within 30 days."
                : "The published record will be removed. The change remains in the activity log."}
            </p>
          )}
          {resource === "terms" && (
            <p className="gov-inline-note gov-field-wide">
              This updates the active academic context. It does not promote student levels or remove
              previous academic materials.
            </p>
          )}
        </fieldset>
        {error && (
          <div className="gov-form-error" role="alert">
            {error}
          </div>
        )}
        {uploadId && <p role="status">Submission ID: {uploadId}</p>}
        <div className="gov-dialog-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => (reviewing ? setReviewing(false) : close())}
          >
            {reviewing ? "Back to details" : "Cancel"}
          </Button>
          <Button
            type="submit"
            destructive={destructive}
            loading={busy}
            loadingText={uploading ? "Uploading material…" : "Saving change…"}
          >
            {reviewing
              ? "Create university"
              : resource === "universities" && action === "create"
                ? "Review setup"
                : uploading
                  ? "Upload material"
                  : action === "create"
                    ? "Save"
                    : action === "update"
                      ? "Save changes"
                      : actionText(resource, action)}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Loading(): React.ReactElement {
  return (
    <div className="gov-loading" role="status" aria-label="Loading workspace">
      <div />
      <div />
      <div />
      <span>Loading records…</span>
    </div>
  );
}
function Help(): React.ReactElement {
  return (
    <div className="gov-help">
      {[
        {
          q: "How do material reviews work?",
          a: "Lecturers upload a material with its course, academic level and semester. An administrator reviews it and records a decision. Approved materials enter background processing; they become searchable after processing completes. Approval and processing are separate steps.",
        },
        {
          q: "What should I do with a rejected submission?",
          a: "Read the reviewer’s note, correct your material and upload the replacement. Open the original rejected record and choose Submit correction to link the new pending submission. Each rejected submission permits one replacement, preserving the original review.",
        },
        {
          q: "How do exam restrictions work?",
          a: "Schedule a start and end time for an academic level and, optionally, a course. The server applies restrictions during that window. Lecturers can restrict only courses assigned to them. Cancel a restriction to end it early. Restrictions last at most 24 hours.",
        },
        {
          q: "What changes during an academic rollover?",
          a: "The current academic session and semester change. Student levels and earlier academic materials are preserved. A senior university administrator is required to make this change.",
        },
        {
          q: "Who can manage administrators?",
          a: "Senior university administrators may assign standard administrators within their university. Only a platform administrator can assign a senior administrator. You cannot change your own access or remove the last active senior administrator.",
        },
        {
          q: "How do I get help?",
          a: "Open the Support inbox and create a request. Include the course code, affected material and a clear description of the issue. Avoid including passwords, patient details or private student conversations.",
        },
      ].map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
