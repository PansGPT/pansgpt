import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createServerClient } from "@supabase/ssr";
import { safeAuthNext } from "../lib/auth-navigation.ts";
import { browserAuthHeaders } from "../lib/supabase/request-headers.ts";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100 Safari/537.36";
const env = {
  NEXT_PUBLIC_APP_URL: "https://app.example.invalid",
  NEXT_PUBLIC_SUPABASE_URL: "https://auth.example.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-public-key",
};
test("the real server Auth SDK puts the forwarded browser agent on its outbound request", async () => {
  let sent;
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: {
        headers: browserAuthHeaders(new Headers({ "User-Agent": agent })),
        fetch: async (url, options) => {
          sent = { url: String(url), headers: new Headers(options.headers) };
          return Response.json({
            id: "01900000-0000-7000-8000-000000000001",
            aud: "authenticated",
            role: "authenticated",
          });
        },
      },
    }
  );
  const result = await supabase.auth.getUser("synthetic-access-token");
  assert.equal(result.error, null);
  assert.equal(sent.url, "https://auth.example.invalid/auth/v1/user");
  assert.equal(sent.headers.get("User-Agent"), agent);
});
function load(path, overrides) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    URL,
    require(id) {
      if (id === "@/env") return { env };
      if (id === "@/lib/auth-navigation") return { safeAuthNext };
      if (id.endsWith("request-headers")) return { browserAuthHeaders };
      return Object.hasOwn(overrides, id) ? overrides[id] : require(id);
    },
  });
  return exports;
}
test("auth metadata forwards only a bounded browser user-agent, never caller credentials or IP headers", () => {
  const headers = new Headers({
    "User-Agent": agent,
    Cookie: "private-cookie",
    Authorization: "Bearer private",
    "X-Forwarded-For": "192.0.2.10",
    "X-API-Key": "private-client-key",
  });
  assert.deepEqual(browserAuthHeaders(headers), { "User-Agent": agent });
  for (const value of [
    null,
    "",
    " ",
    "x".repeat(1025),
    "bad\r\nInjected: value",
    "agent\u0000",
    "non-ascii-\u0100",
  ])
    assert.deepEqual(browserAuthHeaders({ get: () => value }), {});
});
test("OAuth callback forwards browser metadata and preserves successful cookie exchange and safe redirect", async () => {
  let options;
  let exchanged;
  const route = load("../app/auth/callback/route.ts", {
    "@supabase/ssr": {
      createServerClient(url, key, config) {
        assert.equal(url, env.NEXT_PUBLIC_SUPABASE_URL);
        assert.equal(key, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        options = config;
        return {
          auth: {
            async exchangeCodeForSession(code) {
              exchanged = code;
              config.cookies.setAll([
                {
                  name: "synthetic-session",
                  value: "synthetic-refreshed",
                  options: { httpOnly: true, path: "/" },
                },
              ]);
              return { error: null };
            },
          },
        };
      },
    },
  });
  const response = await route.GET(
    new NextRequest(
      "https://app.example.invalid/auth/callback?code=synthetic-code&next=https://untrusted.invalid",
      {
        headers: {
          "User-Agent": agent,
          Cookie: "synthetic-session=synthetic-old",
          "X-Forwarded-For": "192.0.2.10",
        },
      }
    )
  );
  assert.equal(exchanged, "synthetic-code");
  assert.deepEqual(options.global.headers, { "User-Agent": agent });
  assert.equal(response.headers.get("location"), "https://app.example.invalid/app");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.cookies.get("synthetic-session").value, "synthetic-refreshed");
  assert.equal(response.cookies.get("synthetic-session").httpOnly, true);
});
test("missing browser metadata never invents a device and callback errors keep the recovery redirect", async () => {
  let forwarded;
  const route = load("../app/auth/callback/route.ts", {
    "@supabase/ssr": {
      createServerClient(_url, _key, config) {
        forwarded = config.global.headers;
        return {
          auth: {
            exchangeCodeForSession: async () => ({
              error: new Error("Synthetic exchange failure"),
            }),
          },
        };
      },
    },
  });
  const response = await route.GET(
    new NextRequest(
      "https://app.example.invalid/auth/callback?code=synthetic-code&next=/update-password"
    )
  );
  assert.deepEqual(forwarded, {});
  assert.equal(
    response.headers.get("location"),
    "https://app.example.invalid/forgot-password?error=link_expired"
  );
});
test("server-component auth uses request-local browser headers and existing cookie adapters", async () => {
  let options;
  const server = load("../lib/supabase/server.ts", {
    "next/headers": {
      headers: async () => new Headers({ "User-Agent": agent, "X-Forwarded-For": "192.0.2.10" }),
      cookies: async () => ({
        getAll: () => [{ name: "synthetic-session", value: "owned" }],
        set: () => {
          throw new Error("Read-only server component");
        },
      }),
    },
    "@supabase/ssr": {
      createServerClient(_url, _key, config) {
        options = config;
        return { auth: "synthetic-adapter" };
      },
    },
  });
  await server.createClient();
  assert.deepEqual(options.global.headers, { "User-Agent": agent });
  assert.equal(options.cookies.getAll()[0].value, "owned");
  assert.doesNotThrow(() =>
    options.cookies.setAll([{ name: "synthetic-session", value: "refreshed" }])
  );
});
