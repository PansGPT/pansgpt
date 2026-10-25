import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/chat",
  testMatch: "**/*.spec.cjs",
  workers: 1,
  retries: 0,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4178",
    viewport: { width: 1440, height: 975 },
    launchOptions: { executablePath: process.env.CHROME_EXECUTABLE || undefined },
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "node ../../packages/ui/node_modules/vite/bin/vite.js --config tests/chat/preview/vite.config.mjs",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: false,
    timeout: 90000,
  },
});
