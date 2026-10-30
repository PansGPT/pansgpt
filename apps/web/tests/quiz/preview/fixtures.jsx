import React, { useMemo, useSyncExternalStore } from "react";
export const env = { NEXT_PUBLIC_API_URL: "http://127.0.0.1:4180" };
const subscribe = (notify) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};
const navigate = (url) => {
  history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
const router = { push: navigate, replace: navigate, refresh: () => {} };
export const useRouter = () => router;
export function useSearchParams() {
  const query = useSyncExternalStore(subscribe, () => location.search);
  return useMemo(() => new URLSearchParams(query), [query]);
}
export function useAuth() {
  const owner = useSyncExternalStore(subscribe, () => window.__quizOwner || "synthetic-owner");
  return {
    session: { access_token: owner },
    profile: { id: owner, university_id: "synthetic-university" },
  };
}
export default function Link({ href, children, ...props }) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
