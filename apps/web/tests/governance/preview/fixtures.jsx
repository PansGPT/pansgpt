import React, { useMemo, useSyncExternalStore } from "react";
const subscribe = (notify) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};
function navigate(url) {
  history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
const router = { push: navigate, replace: navigate };
export const useRouter = () => router;
export function usePathname() {
  return useSyncExternalStore(subscribe, () => location.pathname);
}
export function useSearchParams() {
  const query = useSyncExternalStore(subscribe, () => location.search);
  return useMemo(() => new URLSearchParams(query), [query]);
}
export const env = { NEXT_PUBLIC_API_URL: "http://127.0.0.1:4182" };
const signedOut = { loading: false, session: null, profile: null };
export function useAuth() {
  const state = useSyncExternalStore(subscribe, () => window.__governanceAuth || signedOut);
  return {
    ...state,
    loading: false,
    profileError: null,
    refreshProfile: async () => {
      const response = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${state.session.access_token}` },
      });
      if (!response.ok) return null;
      const profile = await response.json();
      window.__governanceAuth = { ...state, profile };
      window.dispatchEvent(new PopStateEvent("popstate"));
      return profile;
    },
    signOut: async () => {
      window.__governanceAuth = signedOut;
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  };
}
export default function Link({ href, children, onClick, ...props }) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        onClick?.(event);
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
