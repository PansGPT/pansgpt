import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/auth",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
