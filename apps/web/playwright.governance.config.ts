import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/governance",
  testMatch: "**/*.spec.cjs",
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4182",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath:
        process.env.CHROME_EXECUTABLE ||
        (process.platform === "win32"
          ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
          : undefined),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node ../../packages/ui/node_modules/vite/bin/vite.js --config tests/governance/preview/vite.config.mjs",
    url: "http://127.0.0.1:4182",
    reuseExistingServer: false,
    timeout: 90000,
  },
});
