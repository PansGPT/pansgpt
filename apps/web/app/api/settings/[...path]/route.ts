import { env } from "@/env";
import { proxySettings } from "@/lib/settings-proxy";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params;
  return proxySettings(request, path, {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    apiKey: env.X_API_KEY_WEB,
  });
}
export { handle as GET, handle as PUT, handle as POST, handle as DELETE };
