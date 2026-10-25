import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { safeAuthNext, signupDestination } from "../lib/auth-navigation.ts";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const source = readFileSync(new URL("../lib/supabase/middleware.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

// Run the real middleware with only its auth service and environment replaced.
// No hosted credentials, account creation or network requests are needed.
async function requestSession(path, { authenticated = false, unavailable = false } = {}) {
  const exports = {};
  runInNewContext(outputText, {
    exports,
    URL,
    require(id) {
      if (id === "@/lib/auth-navigation") return { safeAuthNext, signupDestination };
      if (id === "@/env")
        return {
          env: {
            NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic",
          },
        };
      if (id === "@supabase/ssr")
        return {
          createServerClient(_url, _key, { cookies }) {
            return {
              auth: {
                async getUser() {
                  cookies.setAll([
                    {
                      name: "synthetic-session",
                      value: "refreshed",
                      options: { httpOnly: true, path: "/" },
                    },
                  ]);
                  if (unavailable) throw new Error("Synthetic auth outage");
                  return { data: { user: authenticated ? { id: "synthetic-user" } : null } };
                },
              },
            };
          },
        };
      return require(id);
    },
  });
  return exports.updateSession(new NextRequest(`http://localhost:3000${path}`));
}

test("verified root sessions redirect internally and preserve refreshed cookies", async () => {
  const response = await requestSession("/?next=https://untrusted.invalid", {
    authenticated: true,
  });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/app");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.cookies.get("synthetic-session")?.value, "refreshed");
  assert.equal(response.cookies.get("synthetic-session")?.httpOnly, true);
});

test("signed-out and unverifiable sessions keep the root landing page accessible", async () => {
  for (const options of [{}, { unavailable: true }]) {
    const response = await requestSession("/", options);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }
});

test("root routing preserves protected-page, recovery and signup destinations", async () => {
  const cases = [
    ["/app/chat?session=example", {}, "/login?next=%2Fapp%2Fchat%3Fsession%3Dexample"],
    ["/update-password", {}, "/forgot-password?error=recovery_required"],
    ["/login?next=%2Fapp%2Fchat", { authenticated: true }, "/app/chat"],
    ["/signup?invite=example", { authenticated: true }, "/onboarding?invite=example"],
  ];
  for (const [path, options, expected] of cases) {
    const response = await requestSession(path, options);
    assert.equal(response.headers.get("location"), `http://localhost:3000${expected}`);
  }
  const app = await requestSession("/app", { authenticated: true });
  assert.equal(app.headers.get("location"), null);
});
