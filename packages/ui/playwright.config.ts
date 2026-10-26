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
    // Headless Linux defaults to full hinting (integer glyph advances). Use
    // subpixel metrics when comparing the locally hosted fonts with Figma.
    launchOptions: { args: ["--font-render-hinting=none"] },
    viewport: { width: 1280, height: 1100 },
    trace: "retain-on-failure",
  },
  webServer: {
    // [CHAT FIX 2] Own Vite directly so Windows cleanup can stop the actual server.
    command: compiled
      ? "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort"
      : "node node_modules/vite/bin/vite.js",
    url: baseURL,
    reuseExistingServer: false, // [CHAT FIX 2] Do not test against an unrelated stale preview.
    timeout: 60000,
  },
  reporter: "list",
});
