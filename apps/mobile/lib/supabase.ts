// ==============================================================================
// PansGPT 2.0 Mobile Supabase Client with Expo SecureStore (Phase 7.7)
// ==============================================================================

import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { mobileEnv } from "../src/config/env";

export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      throw e;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("SecureStore removeItem failed:", e);
    }
  },
};

export const supabase = createClient(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
