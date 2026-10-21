"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Mic,
  ArrowUp,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ApplicationNavPanel,
  Button,
  Input,
  Slideout,
  ThemeProvider,
  Tooltip,
} from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import { BrandMark } from "@/components/auth/brand-art";
import { destinations } from "./navigation";
import { WorkspaceLoading } from "./loading";
import { ProfileDrawer } from "./profile";
import { usePreferences } from "./use-preferences";
import { DashboardProvider } from "./dashboard-data";
import { ChatDraftProvider, useChatDraft } from "./chat-draft";
import { SidebarLinks } from "./sidebar";
import { AccountMenu } from "./account-menu";

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
  const router = useRouter();
  const [message, setMessage] = useState("");
  const { setDraft } = useChatDraft();
  const reduced = useReducedMotion();
  const main = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [panels, setPanels] = useState({
    pathname,
    navigation: false,
    search: false,
    profile: false,
    help: false,
  });
  if (panels.pathname !== pathname)
    setPanels({ pathname, navigation: false, search: false, profile: false, help: false });
  const navigationOpen = panels.pathname === pathname && panels.navigation;
  const searchOpen = panels.pathname === pathname && panels.search;
  const profileOpen = panels.pathname === pathname && panels.profile;
  const profileReturn = useRef<HTMLButtonElement | null>(null);
  const helpOpen = panels.pathname === pathname && panels.help;
  function returnToAccount(): void {
    if (profileReturn.current?.isConnected && profileReturn.current.getClientRects().length)
      profileReturn.current.focus();
    else document.querySelector<HTMLButtonElement>(".shell-mobile-menu")?.focus();
  }
  function setProfileOpen(open: boolean): void {
    setPanels((value) => ({ ...value, pathname, profile: open, navigation: false, help: false }));
  }
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
    setPanels({ pathname, navigation: false, search: true, profile: false, help: false });
  }, [pathname]);
  const preferences = usePreferences(profile.id, profile.university_id);
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
  const panel = (mobile = false): React.ReactElement => (
    <ApplicationNavPanel
      logo={
        <div className="shell-brand-row">
          <Brand />
          {!mobile && (
            <button
              className="shell-collapse"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          )}
        </div>
      }
      account={
        <AccountMenu
          profile={profile}
          openProfile={(opener) => {
            profileReturn.current = opener;
            setProfileOpen(true);
          }}
          openHelp={(opener) => {
            profileReturn.current = opener;
            setPanels({ pathname, navigation: false, search: false, profile: false, help: true });
          }}
        />
      }
      label={mobile ? "Mobile navigation" : "Primary navigation"}
      navigation={
        <SidebarLinks
          close={() => {
            if (mobile) setNavigationOpen(false);
          }}
          openSearch={openSearch}
        />
      }
    />
  );
  const matches = destinations.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <DashboardProvider profile={profile}>
      <div className="app-shell" data-collapsed={collapsed} data-chat={pathname === "/app/chat"}>
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
            <div className="shell-header-actions">
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
                  if (navigationOrigin.current !== pathname || profileOpen || helpOpen) {
                    event.preventDefault();
                    if (!profileOpen && !helpOpen) main.current?.focus({ preventScroll: true });
                  }
                }}
                trigger={
                  <button
                    className="shell-icon-button shell-mobile-menu"
                    aria-label="Open navigation"
                  >
                    <Menu size={22} />
                  </button>
                }
              >
                {panel(true)}
              </Slideout>
            </div>
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
          {pathname !== "/app/chat" && (
            <form
              className="shell-mobile-composer"
              onSubmit={(event) => {
                event.preventDefault();
                const prompt = message.trim();
                setDraft(prompt.slice(0, 4000));
                router.push("/app/chat");
                setMessage("");
              }}
            >
              <button type="button" aria-label="Quick search" onClick={openSearch}>
                <Plus size={21} aria-hidden="true" />
              </button>
              <input
                aria-label="Message PansGPT"
                placeholder="Message PansGPT"
                value={message}
                maxLength={4000}
                onChange={(event) => setMessage(event.target.value)}
              />
              <button
                type="button"
                aria-label="Voice input"
                disabled
                title="Voice input is coming soon"
              >
                <Mic size={19} aria-hidden="true" />
              </button>
              <button type="submit" aria-label="Open chat">
                <ArrowUp size={19} aria-hidden="true" />
              </button>
            </form>
          )}
          {pathname !== "/app/chat" && (
            <Tooltip content="Message PansGPT" side="left" arrow>
              <Link
                href="/app/chat"
                className="shell-assistant-launcher"
                aria-label="Message PansGPT"
              >
                <BrandMark />
              </Link>
            </Tooltip>
          )}
        </div>
        <ProfileDrawer
          profile={profile}
          preferences={preferences}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          hideTrigger
          returnFocus={returnToAccount}
        />
        <Slideout
          title="Help"
          description="Find your way around PansGPT."
          open={helpOpen}
          onOpenChange={(open) => setPanels((value) => ({ ...value, help: open }))}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnToAccount();
          }}
        >
          <div className="dashboard-sample-preview">
            <h3>Your study space</h3>
            <p>
              Open Library for your course documents, or use Message PansGPT to start a study chat.
            </p>
            <h3>Find a page quickly</h3>
            <p>Use the search beside Recent chats, or press Ctrl + K (Command + K on Mac).</p>
            <h3>Your preferences</h3>
            <p>Open your account at the bottom of the sidebar to change your theme or sign out.</p>
            <p>Cards marked Sample show the intended experience while your account is new.</p>
          </div>
        </Slideout>
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
    </DashboardProvider>
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
    <ChatDraftProvider key={profile.id}>
      <Workspace profile={profile}>{children}</Workspace>
    </ChatDraftProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <ThemeProvider initialTheme="dark">
      <VerifiedWorkspace>{children}</VerifiedWorkspace>
    </ThemeProvider>
  );
}
