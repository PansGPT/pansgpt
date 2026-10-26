import React, { createContext, useContext, useState, useEffect, useSyncExternalStore } from "react";
import { useTheme } from "@pansgpt/ui/shell";
const params = new URLSearchParams(location.search);
const initialState = params.get("state") || "sample";
const DataContext = createContext(null);
export const env = { NEXT_PUBLIC_API_URL: "http://127.0.0.1:4178" };
const previewDocuments = globalThis.__PREVIEW_DOCUMENTS__ || [];
const profile = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "study@example.test",
  first_name: "Ojonugwa",
  last_name: "Student",
  role: "student",
  university_id: "00000000-0000-4000-8000-000000000002",
  university_name: "Sample University",
  current_level: "200",
  terms_accepted_at: "2026-10-22T00:00:00Z",
  is_onboarded: true,
  is_active: true,
  ...globalThis.__PREVIEW_ACCOUNT__,
};
export function useAuth() {
  return {
    profile,
    session: { user: { id: profile.id }, access_token: "invalid-fixture-not-an-access-token" },
    loading: false,
    signOut: async () => {},
    refreshProfile: async () => profile,
  };
}
export function usePreferences() {
  const { theme, setTheme, ready } = useTheme();
  useEffect(() => {
    globalThis.__setChatTestTheme = setTheme;
    return () => {
      delete globalThis.__setChatTestTheme;
    };
  }, [setTheme]);
  return {
    theme,
    ready,
    save: setTheme,
    status: "saved",
    university: "Sample University",
    credits: 20,
  };
}
export function DashboardProvider({ children }) {
  const [state, setState] = useState(initialState);
  const value = {
    recent:
      state === "r2"
        ? previewDocuments.map((d) => ({
            updated_at: d.created_at,
            documents: {
              id: d.id,
              title: d.title,
              course_code: null,
              updated_at: d.updated_at || d.created_at,
            },
          }))
        : [],
    recentSource: state === "r2" ? "library" : "history",
    tasks: [],
    timetable:
      state === "classes"
        ? [
            {
              id: "fixture-class",
              course_title: "Sample pharmacology class",
              day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
              start_time: "09:00",
              time_slot: "09:00",
              venue: "Sample room",
            },
          ]
        : [],
    completed: [],
    activityError: false,
    loading: state === "loading",
    recentError: false,
    eventsError: state === "error",
    reload: () => {
      setState("loading");
      setTimeout(() => setState("sample"), 250);
    },
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useDashboard() {
  return useContext(DataContext);
}
export function useRecentChats() {
  useSyncExternalStore(
    (notify) => {
      window.addEventListener("fixture-chats-changed", notify);
      return () => window.removeEventListener("fixture-chats-changed", notify);
    },
    () => window.__chatFixtureRevision || 0,
    () => 0
  );
  return {
    chats: (window.__chatSessions || [])
      .filter((chat) => !chat.archived_at && !chat.deleted)
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)),
    loading: false,
    error: false,
  };
}
export function usePathname() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("popstate", notify);
      return () => window.removeEventListener("popstate", notify);
    },
    () =>
      location.pathname.startsWith("/app")
        ? location.pathname
        : params.get("surface") === "home"
          ? "/app"
          : "/app/chat"
  );
}
export function useRouter() {
  const navigate = (url, replace = false) => {
    history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return { push: navigate, replace: (url) => navigate(url, true), refresh: () => {} };
}
export default function Link({ href, children, onClick, ...props }) {
  const router = useRouter();
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          String(href).startsWith("/")
        ) {
          event.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </a>
  );
}

export function useSearchParams() {
  const search = useSyncExternalStore(
    (notify) => {
      window.addEventListener("popstate", notify);
      return () => window.removeEventListener("popstate", notify);
    },
    () => location.search
  );
  return new URLSearchParams(search);
}
