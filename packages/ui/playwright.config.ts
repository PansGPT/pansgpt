import { defineConfig } from "@playwright/test";

const compiled = process.env.UI_PREVIEW_BUILT === "1";
const baseURL = `http://127.0.0.1:${compiled ? 4174 : 4173}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  // Large source matrices share one workbench; keep assertion timeouts unchanged.
  timeout: 60000,
  use: {
    baseURL,
    browserName: "chromium",
    viewport: { width: 1280, height: 1100 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: compiled ? "pnpm preview:serve" : "pnpm preview:dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  reporter: "list",
});
