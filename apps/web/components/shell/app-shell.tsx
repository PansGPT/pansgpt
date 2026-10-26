"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Plus, Mic, ArrowUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ApplicationNavPanel, Button, Slideout, ThemeProvider } from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import { profileFailureMessage } from "@/lib/profile-verification";
import { BrandMark } from "@/components/auth/brand-art";
import { ConversationSearch } from "@/components/chat/search-dialog";
import { ConversationUndo } from "@/components/chat/undo-notice";
import { WorkspaceLoading } from "./loading";
import { ProfileDrawer } from "./profile";
import { usePreferences } from "./use-preferences";
import { DashboardProvider } from "./dashboard-data";
import { ChatDraftProvider, useChatDraft } from "./chat-draft";
import { SidebarLinks } from "./sidebar";
import { AccountMenu } from "./account-menu";
import { MobileHomeChat } from "./mobile-home-chat";

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
    else
      document
        .querySelector<HTMLButtonElement>(
          pathname === "/app" ? ".shell-home-account .shell-account-menu" : ".shell-mobile-menu"
        )
        ?.focus();
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
  const searchReturn = useRef<{ element: HTMLElement | null; pathname: string } | null>(null);
  const navigationOrigin = useRef(pathname);
  const openSearch = useCallback(() => {
    searchReturn.current = {
      element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      pathname,
    };
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
          mobile={mobile}
          close={() => {
            if (mobile) setNavigationOpen(false);
          }}
          openSearch={openSearch}
        />
      }
    />
  );
  return (
    <DashboardProvider profile={profile}>
      <div
        className="app-shell"
        data-collapsed={collapsed}
        data-chat={pathname === "/app/chat"}
        data-home={pathname === "/app"}
      >
        <a href="#workspace-content" className="shell-skip">
          Skip to content
        </a>
        <aside className="shell-sidebar" aria-label="Workspace sidebar">
          {panel()}
        </aside>
        <button
          className="shell-collapse shell-collapse-docked"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <div className="shell-workspace">
          <header className="shell-topbar">
            <div className="shell-mobile-brand">
              <Brand />
            </div>
            <div className="shell-header-actions">
              {pathname === "/app" && (
                <div className="shell-home-account">
                  <AccountMenu
                    profile={profile}
                    compact
                    openProfile={(opener) => {
                      profileReturn.current = opener;
                      setProfileOpen(true);
                    }}
                    openHelp={(opener) => {
                      profileReturn.current = opener;
                      setPanels({
                        pathname,
                        navigation: false,
                        search: false,
                        profile: false,
                        help: true,
                      });
                    }}
                    openNavigation={() => {
                      navigationOrigin.current = pathname;
                      setNavigationOpen(true);
                    }}
                  />
                </div>
              )}
              <Slideout
                title="Workspace navigation"
                className="shell-navigation-drawer"
                description="Find your study tools."
                side="left"
                open={navigationOpen}
                onOpenChange={(open) => {
                  if (open) navigationOrigin.current = pathname;
                  setNavigationOpen(open);
                }}
                onCloseAutoFocus={(event) => {
                  if (
                    pathname === "/app" &&
                    navigationOrigin.current === pathname &&
                    !profileOpen &&
                    !helpOpen
                  ) {
                    event.preventDefault();
                    document
                      .querySelector<HTMLButtonElement>(".shell-home-account .shell-account-menu")
                      ?.focus();
                    return;
                  }
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
          {pathname === "/app" && <MobileHomeChat />}
          {pathname !== "/app/chat" && pathname !== "/app" && (
            <form
              className="shell-mobile-composer p-study-composer"
              onSubmit={(event) => {
                event.preventDefault();
                const prompt = message.trim();
                if (!prompt) return;
                setDraft(prompt.slice(0, 4000));
                router.push("/app/chat");
                setMessage("");
              }}
            >
              <div className="p-study-composer-row">
                <button
                  className="p-study-composer-control"
                  type="button"
                  aria-label="Quick search"
                  onClick={openSearch}
                >
                  <Plus size={25} aria-hidden="true" />
                </button>
                <input
                  className="p-study-composer-input"
                  aria-label="Message PansGPT"
                  placeholder="Message PansGPT…"
                  value={message}
                  maxLength={4000}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <button
                  type="button"
                  className="p-study-composer-control"
                  aria-label="Open chat for voice input"
                  title={
                    pathname === "/app"
                      ? "Continue in chat to record a question"
                      : "Voice input is available in chat"
                  }
                  onClick={() => {
                    setDraft(message.trim().slice(0, 4000));
                    router.push("/app/chat");
                    setMessage("");
                  }}
                >
                  <Mic size={19} aria-hidden="true" />
                </button>
                <button
                  className="p-study-composer-control p-study-composer-submit"
                  type="submit"
                  aria-label="Send message"
                  disabled={!message.trim()}
                >
                  <ArrowUp size={19} aria-hidden="true" />
                </button>
              </div>
            </form>
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
              Open Library for your course documents, or choose New chat in the navigation to start
              a study chat.
            </p>
            <h3>Find your conversations</h3>
            <p>
              Search titles and messages beside Recent chats, or press Ctrl + K (Command + K on
              Mac).
            </p>
            <h3>Your preferences</h3>
            <p>Open your account at the bottom of the sidebar to change your theme or sign out.</p>
            <p>Cards marked Sample show the intended experience while your account is new.</p>
          </div>
        </Slideout>
        {searchOpen && (
          <ConversationSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const previous = searchReturn.current;
              if (previous?.pathname === pathname && previous.element?.isConnected)
                previous.element.focus();
              else main.current?.focus({ preventScroll: true });
            }}
          />
        )}
        <ConversationUndo />
      </div>
    </DashboardProvider>
  );
}

function VerifiedWorkspace({ children }: { children: ReactNode }): React.ReactElement {
  const { session, profile, profileError, loading, refreshProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!session && !profileError)
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    else if (profile && !profile.is_onboarded) router.replace("/onboarding");
  }, [loading, pathname, profile, profileError, router, session]);
  if (loading || (!session && !profileError) || (profile && !profile.is_onboarded))
    return <WorkspaceLoading message="Connecting to your study space…" />;
  if (!profile || profile.id !== session?.user.id) {
    const failure = profileFailureMessage(
      profileError ?? { code: "invalid_response", retryable: true }
    );
    return (
      <div className="shell-verification" role="alert">
        <h1>{failure.title}</h1>
        <p>{failure.description}</p>
        {profileError?.retryable !== false && (
          <Button
            disabled={retrying}
            leadingIcon={null}
            trailingIcon={null}
            onClick={() => {
              if (profileError?.code === "session_unavailable") {
                window.location.reload();
                return;
              }
              setRetrying(true);
              void refreshProfile().finally(() => setRetrying(false));
            }}
          >
            {retrying
              ? "Checking…"
              : profileError?.code === "session_unavailable"
                ? "Reload sign-in"
                : "Retry profile verification"}
          </Button>
        )}
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
  }
  return (
    <ChatDraftProvider key={`${profile.id}:${profile.university_id}`}>
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
