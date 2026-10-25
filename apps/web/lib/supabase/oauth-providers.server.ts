import { unstable_cache } from "next/cache";
import { env } from "@/env";
import { fetchOAuthProviders, type OAuthProviderSettings } from "./oauth-providers";

// Only validated public metadata is cached. Arguments scope it to the Supabase
// project/key; auth sessions and failed lookups never enter this cache.
const enabledProviders = unstable_cache(fetchOAuthProviders, ["oauth-provider-settings-v1"], {
  revalidate: 60,
});

export async function getOAuthProviderSettings(): Promise<OAuthProviderSettings> {
  try {
    const providers = await enabledProviders(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    return { status: "ready", providers };
  } catch {
    return { status: "unavailable", providers: [] };
  }
}
