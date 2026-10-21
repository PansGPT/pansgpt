import { safeAuthNext, signupDestination } from "@/lib/auth-navigation";
import { env } from "@/env";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@pansgpt/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // If Supabase is unreachable or DNS fails, gracefully degrade to unauthenticated
    user = null;
  }

  const pathname = request.nextUrl.pathname;

  const redirect = (path: string): NextResponse => {
    const response = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  if (!user && pathname === "/update-password")
    return redirect("/forgot-password?error=recovery_required");
  if (
    !user &&
    (pathname === "/app" || pathname.startsWith("/app/") || pathname === "/onboarding")
  ) {
    return redirect(`/login?next=${encodeURIComponent(pathname + request.nextUrl.search)}`);
  }
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return redirect(
      safeAuthNext(
        request.nextUrl.searchParams.get("next"),
        pathname === "/signup"
          ? signupDestination(request.nextUrl.searchParams.get("invite"))
          : "/app"
      )
    );
  }
  return supabaseResponse;
}
