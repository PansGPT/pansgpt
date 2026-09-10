// ==============================================================================
// PansGPT 2.0 Desktop Environment Configuration
// ==============================================================================

export const desktopEnv = {
  apiUrl: process.env.API_BASE_URL || "http://localhost:8000",
  supabaseUrl: process.env.SUPABASE_URL || "https://nrzbjhqtcxlfiyvoeanb.supabase.co",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "placeholder_anon_key",
  sentryDsn: process.env.SENTRY_DSN,
};
