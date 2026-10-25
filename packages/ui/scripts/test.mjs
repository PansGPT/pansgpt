import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const commands = [
  {
    cli: new URL("../node_modules/vite/bin/vite.js", import.meta.url),
    args: ["build", "--logLevel", "warn"],
    env: process.env,
  },
  {
    cli: new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
    args: ["test", ...process.argv.slice(2)],
    env: { ...process.env, UI_PREVIEW_BUILT: "1" },
  },
];

// Build once before navigation, so tests do not race thousands of cold Vite
// transforms. Keep Playwright's assertions, timeouts, traces and exit code intact.
for (const { cli, args, env } of commands) {
  const result = spawnSync(process.execPath, [fileURLToPath(cli), ...args], {
    cwd: root,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
