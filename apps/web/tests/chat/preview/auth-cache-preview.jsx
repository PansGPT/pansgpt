import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../../../lib/auth-context";
const owner = "00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002";
export function AuthCachePreview() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const cache = await caches.open(`pansgpt-reader-pdfs-v1:${owner}`);
      for (const [id, size] of [
        ["synthetic-large", Math.round(7.8 * 1024 * 1024)],
        ["synthetic-small", 512 * 1024],
      ]) {
        const bytes = new Uint8Array(size);
        bytes.set(new TextEncoder().encode("%PDF-synthetic-storage-fixture"));
        await cache.put(
          new URL(`/__private-reader-pdf/${id}?revision=1`, location.origin),
          new Response(bytes, {
            headers: {
              "content-type": "application/pdf",
              "content-length": String(size),
              "x-pansgpt-stored-at": String(Date.now()),
            },
          })
        );
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      <small>Synthetic auth/cache regression — no hosted accounts or real documents</small>
      {ready && (
        <AuthProvider>
          <Probe />
        </AuthProvider>
      )}
    </>
  );
}
function Probe() {
  const { profile, profileError, refreshProfile, signOut, loading, user } = useAuth();
  return (
    <main>
      <h1>
        {loading
          ? "Checking synthetic profile"
          : profile
            ? "Synthetic profile verified"
            : profileError
              ? "Synthetic profile unavailable"
              : "Synthetic signed out"}
      </h1>
      {user && <button onClick={() => void refreshProfile()}>Retry synthetic profile</button>}
      {profile && <button onClick={() => void signOut()}>Sign out synthetic session</button>}
    </main>
  );
}
