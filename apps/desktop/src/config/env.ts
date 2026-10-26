function required(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("placeholder")) throw new Error(`Missing desktop setting ${name}`);
  return value;
}
export const desktopEnv = {
  apiUrl: required("API_BASE_URL"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  webAppUrl: required("WEB_APP_URL"),
};
