"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  university_id: string | null;
  university_name?: string | null;
  current_level: string | null;
  terms_accepted_at: string | null;
  is_onboarded: boolean;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (token: string, userId?: string): Promise<UserProfile | null> => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          return data;
        }
      } catch {
        // Backend offline or unreachable; fall back to direct Supabase query
      }

      try {
        const targetId = userId || session?.user?.id;
        if (targetId) {
          const { data: dbUser } = await (supabase as any)
            .from("users")
            .select(
              "id, email, first_name, last_name, university_id, current_level, terms_accepted_at, roles"
            )
            .eq("id", targetId)
            .maybeSingle();

          if (dbUser) {
            const isOnboarded = Boolean(
              dbUser.university_id && dbUser.current_level && dbUser.terms_accepted_at
            );
            const fallbackProfile: UserProfile = {
              id: dbUser.id,
              email: dbUser.email,
              first_name: dbUser.first_name,
              last_name: dbUser.last_name,
              role: (dbUser.roles && dbUser.roles[0]) || "student",
              university_id: dbUser.university_id,
              current_level: dbUser.current_level,
              terms_accepted_at: dbUser.terms_accepted_at,
              is_onboarded: isOnboarded,
              is_active: true,
            };
            setProfile(fallbackProfile);
            return fallbackProfile;
          }
        }
      } catch {
        // Ignore fallback error
      }

      return null;
    },
    [supabase, session?.user?.id]
  );

  const refreshProfile = useCallback(async () => {
    if (!session?.access_token) return null;
    return await fetchProfile(session.access_token, session.user?.id);
  }, [session, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.access_token) {
          await fetchProfile(currentSession.access_token, currentSession.user?.id);
        }
      } catch (err) {
        console.error("Failed to initialize session", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.access_token) {
        await fetchProfile(newSession.access_token, newSession.user?.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
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
