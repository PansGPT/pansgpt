import Constants from "expo-constants";

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_POSTHOG_KEY?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
  };
};

const extra = (Constants.expoConfig?.extra as Record<string, string | undefined>) || {};

export const mobileEnv = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || "http://localhost:8000",
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.supabaseUrl ||
    "https://nrzbjhqtcxlfiyvoeanb.supabase.co",
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "placeholder_anon_key",
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || extra.posthogKey,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || extra.sentryDsn,
};
