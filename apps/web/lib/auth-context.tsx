"use client";

import { env } from "@/env";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { desktopAuth } from "./desktop-auth";
import { clearThumbnailCaches } from "./document-thumbnail-cache";
import { clearPdfCopies } from "./reader-pdf-cache";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import type { AuthProfileResponse, UpdateProfileRequest } from "@pansgpt/types";
import {
  createProfileVerifier,
  requestProfile,
  updateProfile as updateProfileApi,
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
  updateProfile: (payload: UpdateProfileRequest) => Promise<UserProfile>;
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

  const handleUpdateProfile = useCallback(
    async (payload: UpdateProfileRequest): Promise<UserProfile> => {
      const active = currentSession.current;
      if (!active?.access_token || !active.user?.id) {
        throw new Error("No active session found to update profile.");
      }
      const updated = await updateProfileApi(
        env.NEXT_PUBLIC_API_URL,
        { accessToken: active.access_token, userId: active.user.id },
        payload
      );
      setLastVerified(updated);
      setSnapshot({
        userId: active.user.id,
        accessToken: active.access_token,
        status: "ready",
        profile: updated,
      });
      return updated;
    },
    []
  );

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

    // Fast-path: check local storage cache before waiting for auth state change
    const timeout = setTimeout(() => {
      if (!authEventReceived && mounted) {
        timedOut = true;
        setBootstrapping(false);
      }
    }, 2000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      authEventReceived = true;
      clearTimeout(timeout);
      applySession(nextSession);
      if (bootstrapping && !timedOut) {
        setBootstrapping(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [applySession, bootstrapping, supabase]);

  useEffect(() => {
    if (loading) return;
    const active = session?.user.id;
    if (!active) {
      void clearThumbnailCaches();
      void clearPdfCopies();
      return;
    }
    void clearThumbnailCaches(
      profile?.id === session?.user.id && profile?.university_id
        ? { userId: profile.id, universityId: profile.university_id }
        : undefined
    );
    void clearPdfCopies(
      profile?.id === session?.user.id && profile?.university_id
        ? { userId: profile.id, universityId: profile.university_id }
        : undefined
    );
  }, [loading, profile?.id, profile?.university_id, session?.user.id]);

  const signOut = async () => {
    await clearThumbnailCaches();
    await clearPdfCopies();
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
        updateProfile: handleUpdateProfile,
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
