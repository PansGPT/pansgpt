"use client";

import { env } from "@/env";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { desktopAuth } from "./desktop-auth";
import { clearThumbnailCaches } from "./document-thumbnail-cache";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import type { AuthProfileResponse } from "@pansgpt/types";
import {
  createProfileVerifier,
  requestProfile,
  visibleVerifiedProfile,
  type ProfileFailure,
  type ProfileSnapshot,
} from "./profile-verification";

export type UserProfile = AuthProfileResponse;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  profileError: ProfileFailure | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const currentSession = useRef<Session | null>(null);
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [lastVerified, setLastVerified] = useState<UserProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sessionError, setSessionError] = useState<ProfileFailure | null>(null);
  const [verifier] = useState(() =>
    createProfileVerifier(
      (identity, signal) => requestProfile(env.NEXT_PUBLIC_API_URL, identity, signal),
      (next) => {
        setSnapshot(next);
        if (next.status === "ready") setLastVerified(next.profile);
        else if (next.status === "error") setLastVerified(null);
      }
    )
  );
  const applySession = useCallback(
    (next: Session | null) => {
      if (currentSession.current?.user.id !== next?.user.id) setLastVerified(null);
      if (
        currentSession.current?.access_token !== next?.access_token ||
        currentSession.current?.user.id !== next?.user.id
      ) {
        verifier.cancel();
        setSnapshot(null);
      }
      currentSession.current = next;
      setSession(next);
      setUser(next?.user ?? null);
      setSessionError(null);
    },
    [verifier]
  );
  const refreshProfile = useCallback(async () => {
    const active = currentSession.current;
    if (!active?.access_token) return null;
    return verifier.verify({ accessToken: active.access_token, userId: active.user.id }, true);
  }, [verifier]);

  const accessToken = session?.access_token;
  const userId = session?.user.id;
  useEffect(() => {
    if (!accessToken || !userId) {
      verifier.cancel();
      return;
    }
    void verifier.verify({ accessToken, userId });
    return () => verifier.cancel();
  }, [accessToken, userId, verifier]);

  const owned =
    snapshot?.accessToken === accessToken && snapshot?.userId === userId ? snapshot : null;
  const profile = visibleVerifiedProfile(
    accessToken && userId ? { accessToken, userId } : null,
    snapshot,
    lastVerified
  );
  const profileError = sessionError ?? (owned?.status === "error" ? owned.error : null);
  const loading =
    bootstrapping || Boolean(session && !profile && (!owned || owned.status === "checking"));

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      if (!mounted || authEventReceived) return;
      timedOut = true;
      setSessionError({ code: "session_unavailable", retryable: true });
      setBootstrapping(false);
    }, 15_000);

    async function initSession() {
      try {
        const nativeSession = await desktopAuth()?.getSession();
        if (!mounted || timedOut || authEventReceived) return;
        if (nativeSession) await supabase.auth.setSession(nativeSession);
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted || timedOut || authEventReceived) return;
        applySession(currentSession);
      } catch {
        if (mounted && !timedOut && !authEventReceived)
          setSessionError({ code: "session_unavailable", retryable: true });
      } finally {
        if (mounted && !authEventReceived) {
          clearTimeout(timer);
          setBootstrapping(false);
        }
      }
    }

    void initSession();
    const stopNative = desktopAuth()?.onOAuthSuccess((tokens) => {
      void supabase.auth.setSession(tokens);
    });
    const refreshNative = setInterval(() => {
      void desktopAuth()
        ?.getSession()
        .then((tokens) => {
          if (tokens) void supabase.auth.setSession(tokens);
        })
        .catch(() => {
          void supabase.auth.signOut();
        });
    }, 45_000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Explicit bootstrap reads the initial session (after native storage). An
      // early INITIAL_SESSION=null must not cancel a pending native restoration.
      if (!mounted || event === "INITIAL_SESSION") return;
      authEventReceived = true;
      clearTimeout(timer);
      applySession(newSession);
      setBootstrapping(false);
    });

    return () => {
      stopNative?.();
      clearInterval(refreshNative);
      clearTimeout(timer);
      mounted = false;
      verifier.cancel();
      subscription.unsubscribe();
    };
  }, [supabase, applySession, verifier]);

  useEffect(() => {
    if (loading) return;
    void clearThumbnailCaches(
      profile?.id === session?.user.id && profile?.university_id
        ? { userId: profile.id, universityId: profile.university_id }
        : undefined
    );
  }, [loading, profile?.id, profile?.university_id, session?.user.id]);

  const signOut = async () => {
    await clearThumbnailCaches();
    try {
      await desktopAuth()?.signOut();
    } finally {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    applySession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        profileError,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
