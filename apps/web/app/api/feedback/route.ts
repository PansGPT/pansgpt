import { env } from "@/env";
import { proxySettings } from "@/lib/settings-proxy";

export async function POST(request: Request): Promise<Response> {
  return proxySettings(request, ["feedback"], {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    apiKey: env.X_API_KEY_WEB,
  });
}
