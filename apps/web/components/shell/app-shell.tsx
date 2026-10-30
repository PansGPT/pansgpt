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
import { MobileProfileButton } from "./mobile-profile-button";
import { MobileHomeChat } from "./mobile-home-chat";
import { WorkspaceNavigationContext } from "./workspace-navigation";
import type { SettingsSectionId } from "./settings/settings-types";
import { SettingsModal } from "./settings/settings-modal";

function Brand(): React.ReactElement {
  return (
    <Link href="/app" className="shell-brand" aria-label="PansGPT home">
      <BrandMark />
      <span>PansGPT</span>
    </Link>
  );
}

function WorkspaceProviders({
  profile,
  openNavigation,
  children,
}: {
  profile: UserProfile;
  openNavigation: (opener: HTMLElement) => void;
  children: ReactNode;
}): React.ReactElement {
  return (
    <WorkspaceNavigationContext.Provider value={openNavigation}>
      <DashboardProvider profile={profile}>{children}</DashboardProvider>
    </WorkspaceNavigationContext.Provider>
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
  const [sidebar, setSidebar] = useState({
    pathname,
    preferredCollapsed: false,
    libraryExpanded: false,
  });
  const [railHovered, setRailHovered] = useState(false);
  const [railToggleFocused, setRailToggleFocused] = useState(false);
  if (sidebar.pathname !== pathname) setSidebar({ ...sidebar, pathname, libraryExpanded: false });
  const inLibrary = pathname === "/app/library" || pathname.startsWith("/app/library/");
  const inLearn = pathname === "/app/learn" || pathname.startsWith("/app/learn/");
  // Library keeps its course navigation visible and starts with a compact app rail.
  // A temporary expansion here must not overwrite the user's choice on other pages.
  const collapsed = inLibrary
    ? sidebar.pathname !== pathname || !sidebar.libraryExpanded
    : sidebar.preferredCollapsed;
  function toggleSidebar(): void {
    setSidebar((value) =>
      inLibrary
        ? { ...value, libraryExpanded: !value.libraryExpanded }
        : { ...value, preferredCollapsed: !value.preferredCollapsed }
    );
  }
  const [panels, setPanels] = useState({
    pathname,
    navigation: false,
    search: false,
    profile: false,
    settings: false,
    help: false,
  });
  if (panels.pathname !== pathname)
    setPanels({
      pathname,
      navigation: false,
      search: false,
      profile: false,
      settings: false,
      help: false,
    });
  const navigationOpen = panels.pathname === pathname && panels.navigation;
  const searchOpen = panels.pathname === pathname && panels.search;
  const profileOpen = panels.pathname === pathname && panels.profile;
  const settingsOpen = panels.pathname === pathname && panels.settings;
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>("account");
  const profileReturn = useRef<HTMLButtonElement | null>(null);
  const helpOpen = panels.pathname === pathname && panels.help;
  function returnToAccount(): void {
    if (profileReturn.current?.isConnected && profileReturn.current.getClientRects().length)
      profileReturn.current.focus();
    else
      document
        .querySelector<HTMLButtonElement>(
          pathname === "/app"
            ? ".shell-home-account .shell-account-menu"
            : inLibrary
              ? ".library-mobile-home-button"
              : ".shell-mobile-menu"
        )
        ?.focus();
  }
  function setProfileOpen(open: boolean): void {
    setPanels((value) => ({
      ...value,
      pathname,
      profile: open,
      settings: false,
      navigation: false,
      help: false,
    }));
  }
  function setSettingsOpen(open: boolean): void {
    setPanels((value) => ({
      ...value,
      pathname,
      settings: open,
      profile: false,
      navigation: false,
      help: false,
    }));
  }
  function setNavigationOpen(open: boolean): void {
    setPanels((value) => ({ ...value, pathname, navigation: open }));
  }
  function setSearchOpen(open: boolean): void {
    setPanels((value) => ({
      ...value,
      pathname,
      search: open,
      profile: false,
      settings: false,
      help: false,
    }));
  }
  const searchReturn = useRef<{ element: HTMLElement | null; pathname: string } | null>(null);
  const navigationOrigin = useRef(pathname);
  const navigationReturn = useRef<HTMLElement | null>(null);
  const openWorkspaceNavigation = useCallback(
    (opener: HTMLElement) => {
      navigationOrigin.current = pathname;
      navigationReturn.current = opener;
      setPanels((value) => ({ ...value, pathname, navigation: true }));
    },
    [pathname]
  );
  const openSearch = useCallback(() => {
    searchReturn.current = {
      element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      pathname,
    };
    setPanels({
      pathname,
      navigation: false,
      search: true,
      profile: false,
      settings: false,
      help: false,
    });
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

  useEffect(() => {
    function handleOpenSettings(event: Event) {
      const customEvent = event as CustomEvent<{ section?: SettingsSectionId }>;
      if (customEvent.detail?.section) {
        setSettingsSection(customEvent.detail.section);
      } else {
        setSettingsSection("account");
      }
      setSettingsOpen(true);
    }
    window.addEventListener("pansgpt:open-settings", handleOpenSettings);
    return () => window.removeEventListener("pansgpt:open-settings", handleOpenSettings);
  }, []);
  const panel = (mobile = false): React.ReactElement => (
    <ApplicationNavPanel
      logo={
        <div className="shell-brand-row">
          {inLibrary && !mobile ? (
            <>
              {!collapsed && <Brand />}
              <button
                key="library-toggle"
                type="button"
                className="shell-library-toggle"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                onClick={toggleSidebar}
                onFocus={() => setRailToggleFocused(true)}
                onBlur={() => setRailToggleFocused(false)}
              >
                {collapsed ? (
                  <span
                    className="t-icon-swap"
                    data-state={railHovered || railToggleFocused ? "b" : "a"}
                    aria-hidden="true"
                  >
                    <span className="t-icon" data-icon="a">
                      <BrandMark />
                    </span>
                    <span className="t-icon" data-icon="b">
                      <PanelLeftOpen size={21} />
                    </span>
                  </span>
                ) : (
                  <PanelLeftClose size={19} aria-hidden="true" />
                )}
              </button>
            </>
          ) : (
            <Brand />
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
          openSettings={(opener, section = "account") => {
            profileReturn.current = opener;
            setSettingsSection(section);
            setSettingsOpen(true);
          }}
          openHelp={(opener) => {
            profileReturn.current = opener;
            setPanels({
              pathname,
              navigation: false,
              search: false,
              profile: false,
              settings: false,
              help: true,
            });
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
    <WorkspaceProviders profile={profile} openNavigation={openWorkspaceNavigation}>
      <div
        className="app-shell"
        data-collapsed={collapsed}
        data-chat={pathname === "/app/chat"}
        data-home={pathname === "/app"}
        data-library={inLibrary}
        data-learn={inLearn}
        data-preferred-collapsed={sidebar.preferredCollapsed}
      >
        <a href="#workspace-content" className="shell-skip">
          Skip to content
        </a>
        <aside
          className="shell-sidebar"
          aria-label="Workspace sidebar"
          onPointerEnter={() => setRailHovered(true)}
          onPointerLeave={() => setRailHovered(false)}
        >
          {panel()}
        </aside>
        {!inLibrary && (
          <button
            className="shell-collapse shell-collapse-docked"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={toggleSidebar}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        )}
        <div className="shell-workspace">
          {!inLearn && (
            <header className="shell-topbar">
              <div className="shell-mobile-brand">
                <Brand />
              </div>
              <div className="shell-header-actions">
                {pathname === "/app" && (
                  <div className="shell-home-account">
                    <MobileProfileButton
                      profile={profile}
                      credits={preferences.credits}
                      creditsTotal={preferences.creditsTotal}
                      onOpen={(opener) => {
                        profileReturn.current = opener;
                        setSettingsSection("account");
                        setSettingsOpen(true);
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
                    if (open) {
                      navigationOrigin.current = pathname;
                      navigationReturn.current = null;
                    }
                    setNavigationOpen(open);
                  }}
                  onCloseAutoFocus={(event) => {
                    if (
                      navigationOrigin.current === pathname &&
                      navigationReturn.current?.isConnected &&
                      !profileOpen &&
                      !helpOpen
                    ) {
                      event.preventDefault();
                      navigationReturn.current.focus();
                      return;
                    }
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
          )}
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
          {pathname !== "/app/chat" && pathname !== "/app" && !inLibrary && !inLearn && (
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
        <SettingsModal
          open={settingsOpen}
          initialSection={settingsSection}
          onOpenChange={setSettingsOpen}
          profile={profile}
          preferences={preferences}
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
    </WorkspaceProviders>
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
