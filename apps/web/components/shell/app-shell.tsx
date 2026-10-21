"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  NotebookPen,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ApplicationNavPanel, Button, Input, Slideout, ThemeProvider } from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import { BrandMark } from "@/components/auth/brand-art";
import { destinations, isCurrentDestination } from "./navigation";
import { WorkspaceLoading } from "./loading";
import { ProfileDrawer } from "./profile";
import { usePreferences } from "./use-preferences";

function Brand(): React.ReactElement {
  return (
    <Link href="/app" className="shell-brand" aria-label="PansGPT home">
      <BrandMark />
      <span>PansGPT</span>
    </Link>
  );
}

function Workspace({
  children,
  profile,
}: {
  children: ReactNode;
  profile: UserProfile;
}): React.ReactElement {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const main = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [panels, setPanels] = useState({ pathname, navigation: false, search: false });
  if (panels.pathname !== pathname) setPanels({ pathname, navigation: false, search: false });
  const navigationOpen = panels.pathname === pathname && panels.navigation;
  const searchOpen = panels.pathname === pathname && panels.search;
  function setNavigationOpen(open: boolean): void {
    setPanels((value) => ({ ...value, pathname, navigation: open }));
  }
  function setSearchOpen(open: boolean): void {
    setPanels((value) => ({ ...value, pathname, search: open }));
  }
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const searchReturn = useRef<{ element: HTMLElement | null; pathname: string } | null>(null);
  const navigationOrigin = useRef(pathname);
  const openSearch = useCallback(() => {
    searchReturn.current = {
      element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      pathname,
    };
    setQuery("");
    setPanels({ pathname, navigation: false, search: true });
  }, [pathname]);
  const preferences = usePreferences(profile.id, profile.university_id);
  const current = destinations.find((item) => isCurrentDestination(pathname, item.href));
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
  }, [pathname]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [openSearch]);
  function links(close = false): React.ReactElement {
    return (
      <div className="shell-links">
        {destinations.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="shell-nav-link"
            aria-label={label}
            aria-current={isCurrentDestination(pathname, href) ? "page" : undefined}
            onClick={() => {
              if (close) setNavigationOpen(false);
            }}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    );
  }
  const panel = (mobile = false): React.ReactElement => (
    <ApplicationNavPanel
      logo={<Brand />}
      label={mobile ? "Mobile navigation" : "Primary navigation"}
      navigation={links(mobile)}
      search={
        <button
          className="shell-search"
          onClick={() => {
            openSearch();
          }}
          aria-label="Quick search"
        >
          <Search size={17} aria-hidden="true" />
          <span>Search pages</span>
          <kbd>⌘ K</kbd>
        </button>
      }
      account={
        <ProfileDrawer profile={profile} preferences={preferences} compact={!mobile && collapsed} />
      }
    >
      {!mobile && (
        <button
          className="shell-collapse"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span>Collapse sidebar</span>
        </button>
      )}
    </ApplicationNavPanel>
  );
  const matches = destinations.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <div className="app-shell" data-collapsed={collapsed}>
      <a href="#workspace-content" className="shell-skip">
        Skip to content
      </a>
      <aside className="shell-sidebar" aria-label="Workspace sidebar">
        {panel()}
      </aside>
      <div className="shell-workspace">
        <header className="shell-topbar">
          <div className="shell-mobile-brand">
            <Brand />
          </div>
          <div className="shell-breadcrumb">
            <span>Your workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{current?.label ?? "Page"}</strong>
          </div>
          <div className="shell-mobile-actions">
            <ProfileDrawer profile={profile} preferences={preferences} compact />
            <Slideout
              title="Workspace navigation"
              description="Find your study tools."
              side="left"
              open={navigationOpen}
              onOpenChange={(open) => {
                if (open) navigationOrigin.current = pathname;
                setNavigationOpen(open);
              }}
              onCloseAutoFocus={(event) => {
                if (navigationOrigin.current !== pathname) {
                  event.preventDefault();
                  main.current?.focus({ preventScroll: true });
                }
              }}
              trigger={
                <button className="shell-icon-button" aria-label="Open navigation">
                  <Menu size={22} />
                </button>
              }
            >
              {panel(true)}
            </Slideout>
          </div>
          <Link href="/app/chat" className="shell-header-chat">
            <Sparkles size={16} aria-hidden="true" />
            Ask PansGPT
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </header>
        <main id="workspace-content" tabIndex={-1} ref={main} className="shell-main">
          <motion.div
            key={pathname}
            className="shell-page"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
          >
            <div className="shell-route-content">{children}</div>
          </motion.div>
        </main>
        <nav className="shell-quick-actions" aria-label="Quick actions">
          <button
            onClick={() => {
              openSearch();
            }}
            aria-label="Quick search"
          >
            <Search size={18} aria-hidden="true" />
            <span>Search</span>
          </button>
          <Link href="/app/chat">
            <Sparkles size={18} aria-hidden="true" />
            <span>Ask AI</span>
          </Link>
          <button disabled title="Note creation is coming soon">
            <NotebookPen size={18} aria-hidden="true" />
            <span>New note</span>
          </button>
        </nav>
      </div>
      <Slideout
        title="Quick search"
        description="Find a page in your workspace."
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInput.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const previous = searchReturn.current;
          if (previous?.pathname === pathname && previous.element?.isConnected)
            previous.element.focus();
          else main.current?.focus({ preventScroll: true });
        }}
      >
        <div className="shell-command">
          <Input
            ref={searchInput}
            label="Search pages"
            placeholder="Library, Chat, Notes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p role="status">
            {matches.length ? `${matches.length} pages` : "No matching pages. Try another name."}
          </p>
          <nav aria-label="Search results">
            {matches.map(({ href, label, description, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setSearchOpen(false)}>
                <Icon size={20} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      </Slideout>
    </div>
  );
}

function VerifiedWorkspace({ children }: { children: ReactNode }): React.ReactElement {
  const { session, profile, loading, refreshProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!session)
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    else if (profile && !profile.is_onboarded) router.replace("/onboarding");
  }, [loading, pathname, profile, router, session]);
  if (loading || !session || (profile && !profile.is_onboarded)) return <WorkspaceLoading />;
  if (!profile || profile.id !== session.user.id || profile.is_active === false)
    return (
      <div className="shell-verification" role="alert">
        <h1>We couldn&apos;t verify your profile</h1>
        <p>Please retry before opening your workspace.</p>
        <Button
          disabled={retrying}
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => {
            setRetrying(true);
            void refreshProfile().finally(() => setRetrying(false));
          }}
        >
          {retrying ? "Checking…" : "Retry profile verification"}
        </Button>
        <Button
          variant="secondary"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => void signOut()}
        >
          Sign Out
        </Button>
      </div>
    );
  return (
    <Workspace key={profile.id} profile={profile}>
      {children}
    </Workspace>
  );
}

export function AppShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <ThemeProvider>
      <VerifiedWorkspace>{children}</VerifiedWorkspace>
    </ThemeProvider>
  );
}
