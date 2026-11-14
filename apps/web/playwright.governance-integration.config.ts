import { defineConfig } from "@playwright/test";
import base from "./playwright.governance.config";
process.env.GOVERNANCE_E2E = "1";
const existing = Array.isArray(base.webServer)
  ? base.webServer
  : base.webServer
    ? [base.webServer]
    : [];
export default defineConfig({
  ...base,
  testMatch: "**/integration.spec.cjs",
  webServer: [
    ...existing,
    {
      command:
        process.platform === "win32"
          ? '"..\\api\\.venv\\Scripts\\python.exe" "..\\..\\tooling\\governance-e2e-server.py"'
          : "../api/.venv/bin/python ../../tooling/governance-e2e-server.py",
      url: "http://127.0.0.1:4183/health/ready",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
