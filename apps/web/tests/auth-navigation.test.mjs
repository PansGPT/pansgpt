import assert from "node:assert/strict";
import test from "node:test";
import { safeAuthNext, signupDestination, authMessage } from "../lib/auth-navigation.ts";

test("auth redirects preserve only supported internal destinations", () => {
  for (const value of [
    "/app",
    "/app/reader?id=123#page=2",
    "/onboarding?invite=abc%2Fdef",
    "/update-password",
  ])
    assert.equal(safeAuthNext(value), value);
  for (const value of [
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/app/%5cevil",
    "/app/%2f%2fevil",
    "/app/../../login",
    "/login",
    "/application",
    "/app/%ZZ",
    "/app\n/evil",
  ])
    assert.equal(safeAuthNext(value), "/app");
});
test("invite tokens remain encoded and unknown auth errors remain generic", () => {
  assert.equal(
    signupDestination("a&next=//evil.example"),
    "/onboarding?invite=a%26next%3D%2F%2Fevil.example"
  );
  assert.equal(signupDestination(null), "/onboarding");
  assert.doesNotMatch(authMessage("internal database credentials leaked"), /credentials/);
  assert.match(authMessage("otp_expired"), /expired/);
});
