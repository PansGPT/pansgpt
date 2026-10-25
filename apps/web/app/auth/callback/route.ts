import { env } from "@/env";
import { safeAuthNext } from "@/lib/auth-navigation";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@pansgpt/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const next = safeAuthNext(params.get("next"));
  const recovery = next === "/update-password";
  const failure = new URL(
    recovery ? "/forgot-password?error=link_expired" : "/login?error=auth_failed",
    env.NEXT_PUBLIC_APP_URL
  );
  const response = NextResponse.redirect(new URL(next, env.NEXT_PUBLIC_APP_URL));
  response.headers.set("Cache-Control", "private, no-store");
  const fail = (): NextResponse => {
    response.headers.set("Location", failure.toString());
    return response;
  };
  const code = params.get("code");
  if (params.has("error") || params.has("error_description") || !code) return fail();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => {
          for (const { name, value, options } of cookies)
            response.cookies.set(name, value, options);
        },
      },
    }
  );
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? fail() : response;
  } catch {
    return fail();
  }
}
