import assert from "node:assert/strict";
import test from "node:test";
import {
  createProfileVerifier,
  requestProfile,
  profileFailureMessage,
} from "../lib/profile-verification.ts";

const identity = { userId: "00000000-0000-4000-8000-000000000001", accessToken: "synthetic-token" };
const profile = {
  id: identity.userId,
  email: "synthetic@example.test",
  role: "student",
  roles: ["student"],
  university_id: null,
  first_name: null,
  last_name: null,
  current_level: null,
  terms_accepted_at: null,
  is_onboarded: false,
  client_type: "web",
  dev_bypass: false,
};
const deferred = () => {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

test("profile responses remain owned and errors retain their actual category", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const signal = new AbortController().signal;
  await t.test(
    "a complete owned API response validates without inventing active/tenant fields",
    async () => {
      globalThis.fetch = async (_url, options) => {
        assert.equal(options.cache, "no-store");
        assert.equal(options.headers.Authorization, "Bearer synthetic-token");
        return Response.json(profile);
      };
      assert.deepEqual(await requestProfile("https://example.invalid", identity, signal), {
        status: "ready",
        profile,
      });
    }
  );
  await t.test(
    "service failures differ from rejected sessions and forbidden accounts",
    async () => {
      for (const [status, code, retryable] of [
        [401, "session_expired", false],
        [403, "forbidden", false],
        [429, "unavailable", true],
        [503, "unavailable", true],
      ]) {
        globalThis.fetch = async () => new Response("Untrusted internal response", { status });
        const result = await requestProfile("https://example.invalid", identity, signal);
        assert.deepEqual(result, { status: "error", error: { code, retryable } });
        assert.doesNotMatch(JSON.stringify(result), /Untrusted/);
      }
      globalThis.fetch = async () => {
        throw new TypeError("Synthetic CORS/network failure");
      };
      assert.equal(
        (await requestProfile("https://example.invalid", identity, signal)).error.code,
        "network"
      );
    }
  );
  await t.test("a foreign or malformed profile never opens the workspace", async () => {
    for (const payload of [
      { ...profile, id: "00000000-0000-4000-8000-000000000002" },
      { id: identity.userId },
      { ...profile, roles: "super_admin" },
    ]) {
      globalThis.fetch = async () => Response.json(payload);
      assert.equal(
        (await requestProfile("https://example.invalid", identity, signal)).error.code,
        "invalid_response"
      );
    }
    globalThis.fetch = async () => new Response("not json");
    assert.equal(
      (await requestProfile("https://example.invalid", identity, signal)).error.code,
      "invalid_response"
    );
  });
  await t.test("an actual abort deadline ends a stalled fetch", async () => {
    const timeout = AbortSignal.timeout;
    AbortSignal.timeout = (milliseconds) => {
      assert.equal(milliseconds, 15000);
      return timeout(5);
    };
    const keepAlive = setTimeout(() => {}, 1000);
    try {
      globalThis.fetch = async (_url, { signal: aborted }) =>
        new Promise((_resolve, reject) => {
          aborted.addEventListener("abort", () => reject(aborted.reason), { once: true });
        });
      assert.equal(
        (await requestProfile("https://example.invalid", identity, signal)).error.code,
        "timeout"
      );
    } finally {
      AbortSignal.timeout = timeout;
      clearTimeout(keepAlive);
    }
  });
  await t.test("caller cancellation is not reported as a new profile failure", async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = async (_url, { signal: aborted }) => {
      aborted.throwIfAborted();
    };
    await assert.rejects(requestProfile("https://example.invalid", identity, controller.signal), {
      name: "AbortError",
    });
  });
});

test("duplicate identity checks share one in-flight lookup", async () => {
  const waiting = deferred();
  const snapshots = [];
  let calls = 0;
  const verifier = createProfileVerifier(
    () => {
      calls++;
      return waiting.promise;
    },
    (state) => snapshots.push(state)
  );
  const first = verifier.verify(identity),
    second = verifier.verify({ ...identity });
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  waiting.resolve({ status: "ready", profile });
  assert.deepEqual(await first, profile);
  assert.deepEqual(
    snapshots.map((state) => state.status),
    ["checking", "ready"]
  );
});

test("account/token changes and cancellation ignore a late response even if transport ignores abort", async () => {
  for (const change of ["account", "token", "cancel"]) {
    const first = deferred(),
      second = deferred(),
      snapshots = [],
      signals = [];
    const verifier = createProfileVerifier(
      (_who, signal) => {
        signals.push(signal);
        return signals.length === 1 ? first.promise : second.promise;
      },
      (state) => snapshots.push(state)
    );
    const old = verifier.verify(identity);
    await Promise.resolve();
    const next = {
      ...identity,
      ...(change === "account"
        ? { userId: "00000000-0000-4000-8000-000000000002" }
        : { accessToken: "new-synthetic-token" }),
    };
    let fresh;
    if (change === "cancel") verifier.cancel();
    else {
      fresh = verifier.verify(next);
      await Promise.resolve();
    }
    assert.equal(signals[0].aborted, true);
    first.resolve({ status: "ready", profile });
    assert.equal(await old, null);
    assert.equal(
      snapshots.some((state) => state.status === "ready"),
      false
    );
    if (fresh) {
      second.resolve({ status: "ready", profile: { ...profile, id: next.userId } });
      await fresh;
      assert.equal(snapshots.at(-1).userId, next.userId);
      assert.equal(snapshots.at(-1).accessToken, next.accessToken);
    }
  }
});

test("an explicit post-onboarding refresh supersedes an older same-token request", async () => {
  const old = deferred(),
    updated = deferred();
  let calls = 0;
  const verifier = createProfileVerifier(
    () => (++calls === 1 ? old.promise : updated.promise),
    () => {}
  );
  const first = verifier.verify(identity);
  await Promise.resolve();
  const second = verifier.verify(identity, true);
  await Promise.resolve();
  old.resolve({ status: "ready", profile });
  updated.resolve({ status: "ready", profile: { ...profile, is_onboarded: true } });
  assert.equal(await first, null);
  assert.equal((await second).is_onboarded, true);
});

test("service error copy does not claim an invalid account or expired session", () => {
  for (const code of ["timeout", "unavailable", "network"]) {
    const copy = profileFailureMessage({ code, retryable: true });
    assert.doesNotMatch(copy.title + copy.description, /invalid account|expired|sign out/i);
  }
});
