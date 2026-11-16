// Explicit synthetic adapter for exercising the real AuthProvider without hosted auth.
const callbacks = new Set();
let session = {
  user: { id: "00000000-0000-4000-8000-000000000001" },
  access_token: "synthetic-profile-token",
};
export function createClient() {
  return {
    auth: {
      onAuthStateChange(callback) {
        callbacks.add(callback);
        if (new URLSearchParams(location.search).has("slow_auth")) {
          globalThis.__completeSyntheticAuth = () => {
            for (const active of callbacks) active("INITIAL_SESSION", session);
          };
        } else
          queueMicrotask(() => {
            if (callbacks.has(callback)) callback("INITIAL_SESSION", session);
          });
        return {
          data: {
            subscription: {
              unsubscribe() {
                callbacks.delete(callback);
              },
            },
          },
        };
      },
      async signOut() {
        session = null;
        for (const callback of callbacks) callback("SIGNED_OUT", null);
        return { error: null };
      },
    },
  };
}
