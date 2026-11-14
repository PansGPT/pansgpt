import { env } from "@/env";
import { proxyGovernance } from "@/lib/governance-proxy";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params;
  return proxyGovernance(request, path, {
    apiUrl: env.NEXT_PUBLIC_API_URL,
    apiKey: env.X_API_KEY_WEB,
  });
}
export { handle as GET, handle as POST };
