import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/quiz",
  testMatch: "**/*.spec.cjs",
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4180",
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: process.env.CHROME_EXECUTABLE || undefined },
    screenshot: "only-on-failure",
    trace: "off",
  },
  webServer: {
    command:
      "node ../../packages/ui/node_modules/vite/bin/vite.js --config tests/quiz/preview/vite.config.mjs",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: false,
    timeout: 90000,
  },
});
