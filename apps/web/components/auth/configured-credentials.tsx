import { getOAuthProviderSettings } from "@/lib/supabase/oauth-providers.server";
import { CredentialsForm } from "./credentials-form";

export async function ConfiguredCredentials({
  mode,
}: {
  mode: "login" | "signup";
}): Promise<React.ReactElement> {
  const providerSettings = await getOAuthProviderSettings();
  return <CredentialsForm mode={mode} initialProviderSettings={providerSettings} />;
}
