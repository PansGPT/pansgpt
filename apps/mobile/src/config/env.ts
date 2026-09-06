// ==============================================================================
// PansGPT 2.0 Mobile Environment Configuration
// ==============================================================================

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_POSTHOG_KEY?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
  };
};

export const mobileEnv = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nrzbjhqtcxlfiyvoeanb.supabase.co',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
};
