export type LocalCacheOwner = { userId: string; universityId: string };
export type LocalCacheKind = "pdf" | "thumbnail";
const epochs = new Map<string, string>();
const pending = new Map<string, Promise<unknown>>();
const prefix = "pansgpt-cache-epoch:";
export function cacheScope(kind: LocalCacheKind, owner: LocalCacheOwner): string {
  return `${prefix}${kind}:${owner.userId}:${owner.universityId}`;
}
/** Capture before starting network work, so a later clear fences that work out. */
export function localCacheEpoch(kind: LocalCacheKind, owner: LocalCacheOwner): string | null {
  const key = cacheScope(kind, owner);
  try {
    return typeof localStorage === "undefined"
      ? (epochs.get(key) ?? "")
      : (localStorage.getItem(key) ?? "");
  } catch {
    return null; // Reading works without caching when coordination is unavailable.
  }
}
export function invalidateLocalCache(kind: LocalCacheKind, owner: LocalCacheOwner): void {
  const key = cacheScope(kind, owner);
  const epoch = crypto.randomUUID();
  if (typeof localStorage === "undefined") epochs.set(key, epoch);
  else localStorage.setItem(key, epoch);
}
/** Web Locks serialize writers and removals across tabs; the queue also supports tests. */
export async function withLocalCacheLock<T>(
  kind: LocalCacheKind,
  owner: LocalCacheOwner,
  operation: () => Promise<T>
): Promise<T> {
  const key = cacheScope(kind, owner);
  const next = (pending.get(key) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async (): Promise<T> =>
      typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request(key, operation)
        : await operation()
    );
  pending.set(key, next);
  try {
    return await next;
  } finally {
    if (pending.get(key) === next) pending.delete(key);
  }
}
export function notifyLocalCacheChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pansgpt-cache-change"));
    try {
      localStorage.setItem(`${prefix}changed`, crypto.randomUUID());
    } catch {
      /* Optional cross-tab notification. */
    }
  }
}
export function observeLocalCacheChanges(refresh: () => void): () => void {
  const storage = (event: StorageEvent): void => {
    if (event.key?.startsWith(prefix)) refresh();
  };
  window.addEventListener("pansgpt-cache-change", refresh);
  window.addEventListener("storage", storage);
  window.addEventListener("focus", refresh);
  return () => {
    window.removeEventListener("pansgpt-cache-change", refresh);
    window.removeEventListener("storage", storage);
    window.removeEventListener("focus", refresh);
  };
}
