export type OAuthProvider = "google" | "apple";

export type OAuthProviderSettings =
  { status: "ready"; providers: OAuthProvider[] } | { status: "unavailable"; providers: [] };

/** Read public provider metadata only; never infer availability from a failed request. */
export async function fetchOAuthProviders(
  url: string,
  publicKey: string,
  signal?: AbortSignal
): Promise<OAuthProvider[]> {
  const timeout = AbortSignal.timeout(3000);
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publicKey },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error("Sign-in provider settings are unavailable.");
  const settings: unknown = await response.json();
  if (
    typeof settings !== "object" ||
    !settings ||
    !("external" in settings) ||
    typeof settings.external !== "object" ||
    !settings.external ||
    Array.isArray(settings.external)
  )
    throw new Error("Sign-in provider settings are invalid.");
  const external = settings.external;
  return (["google", "apple"] as const).filter(
    (provider) => provider in external && Reflect.get(external, provider) === true
  );
}
