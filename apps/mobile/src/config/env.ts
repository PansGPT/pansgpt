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

function required(value: string | undefined, name: string): string {
  if (!value || value.includes("placeholder")) throw new Error(`Missing mobile setting ${name}`);
  return value;
}
export const mobileEnv = {
  apiUrl: required(process.env.EXPO_PUBLIC_API_URL || extra.apiUrl, "API URL"),
  supabaseUrl: required(process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl, "Supabase URL"),
  supabaseAnonKey: required(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey,
    "Supabase public key"
  ),
};
