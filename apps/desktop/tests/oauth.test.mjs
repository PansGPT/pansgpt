import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createAttempt, callbackCode } from "../src/main/oauth-protocol.ts";

test("PKCE uses an independent random verifier and S256 challenge", () => {
  const attempt = createAttempt();
  assert.equal(attempt.challenge, createHash("sha256").update(attempt.verifier).digest("base64url"));
  assert.notEqual(attempt.state, createAttempt().state);
  assert.ok(attempt.verifier.length >= 43);
});
test("callback requires the active attempt's state, loopback endpoint and code", () => {
  const endpoint = "http://127.0.0.1:54321/auth/callback";
  assert.equal(callbackCode(endpoint + "?state=expected&code=valid", endpoint, "expected", Date.now()+1000), "valid");
  for (const url of [endpoint+"?state=wrong&code=x", endpoint+"?state=expected&access_token=injected", "http://127.0.0.1:54322/auth/callback?state=expected&code=x", endpoint+"/other?state=expected&code=x", endpoint+"?state=expected&code=x#access_token=injected"]) {
    assert.throws(() => callbackCode(url, endpoint, "expected", Date.now()+1000));
  }
  assert.throws(() => callbackCode(endpoint+"?state=expected&code=x", endpoint, "expected", Date.now()-1));
});
