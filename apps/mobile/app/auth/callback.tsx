// ==============================================================================
// PansGPT 2.0 Mobile OAuth Deep Link Callback Handler (Phase 7.7)
// Handles redirects to pansgpt://auth/callback
// ==============================================================================

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    code?: string;
    error_description?: string;
  }>();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processAuth() {
      try {
        if (params.error_description) {
          setErrorMessage(params.error_description);
          return;
        }

        // If access token & refresh token are directly passed in params
        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (error) {
            setErrorMessage(error.message);
            return;
          }

          router.replace("/");
          return;
        }

        // If PKCE authorization code is provided
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) {
            setErrorMessage(error.message);
            return;
          }

          router.replace("/");
          return;
        }

        // Check if there is an initial URL with hash parameters (#access_token=...)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes("#")) {
          const hashString = initialUrl.split("#")[1];
          const hashParams = new URLSearchParams(hashString);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setErrorMessage(error.message);
              return;
            }

            router.replace("/");
            return;
          }
        }

        // If no credentials found in URL, verify if session already exists
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/");
        } else {
          setErrorMessage("No authentication credentials found in redirect URL.");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Authentication failed";
        setErrorMessage(message);
      }
    }

    processAuth();
  }, [params, router]);

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Authentication Failed</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Completing sign in...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingBox: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  errorBox: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#ef4444",
    maxWidth: 400,
    alignItems: "center",
  },
  errorTitle: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorText: {
    color: "#d4d4d8",
    fontSize: 14,
    textAlign: "center",
  },
});
