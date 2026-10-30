import { env } from "@/env";
import { proxyQuiz } from "@/lib/quiz-proxy";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params;
  return proxyQuiz(request, path, { apiUrl: env.NEXT_PUBLIC_API_URL, apiKey: env.X_API_KEY_WEB });
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
