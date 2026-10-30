import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";

export function servicesFor(selection = "all") {
  if (!["all", "web", "api", "worker"].includes(selection)) {
    throw new Error("Use pnpm dev, dev:web, dev:api or dev:worker.");
  }
  const python = path.join(root, "apps/api/.venv", windows ? "Scripts/python.exe" : "bin/python");
  const next = path.join(root, "apps/web/node_modules/next/dist/bin/next");
  const launcher = path.join(root, "tooling/dev-service.py");
  return [
    {
      name: "api",
      command: python,
      args: ["-u", launcher, "api"],
      cwd: path.join(root, "apps/api"),
      port: 8000,
    },
    {
      name: "worker",
      command: python,
      args: ["-u", launcher, "worker"],
      cwd: path.join(root, "apps/api"),
      restart: true,
    },
    {
      name: "web",
      command: process.execPath,
      args: [next, "dev", "--port", "3000"],
      cwd: path.join(root, "apps/web"),
      port: 3000,
    },
  ].filter((service) => selection === "all" || service.name === selection);
}

async function checkPort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is already in use. Stop the existing service before starting pnpm dev.`
        )
      )
    );
    server.listen(port, () => server.close(resolve));
  });
}

export async function preflight(services) {
  for (const service of services) {
    if (!existsSync(service.command)) {
      throw new Error(
        `Missing ${service.command}. Install dependencies first (pnpm install; cd apps/api && uv sync --frozen --all-extras).`
      );
    }
    if (service.name === "web" && !existsSync(service.args[0])) {
      throw new Error("Next.js is missing. Run pnpm install first.");
    }
    if (service.port) await checkPort(service.port);
  }
}

// Own only processes started here. Never kill a process based on its port/name.
async function stopTree(child) {
  if (!child.pid) return;
  if (windows) {
    await new Promise((resolve) => {
      const kill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
      kill.once("error", resolve);
      kill.once("exit", resolve);
    });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* Already stopped. */
    }
  }
}

export function supervise(
  services,
  { restartDelayMs = 1000, maxRestarts = 5, log = console.log } = {}
) {
  const children = new Set();
  const timers = new Set();
  let stopping = false;
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  async function stop(code = 0) {
    if (stopping) return done;
    stopping = true;
    for (const timer of timers) clearTimeout(timer);
    process.off("SIGINT", interrupted);
    process.off("SIGTERM", terminated);
    log("[dev] Stopping services...");
    // Windows console Ctrl+C also reaches the children. Allow their signal
    // handlers to run before terminating remaining child process trees.
    if (windows) await new Promise((resolve) => setTimeout(resolve, 1000));
    await Promise.all([...children].map(stopTree));
    resolveDone(code);
    return done;
  }
  const interrupted = () => {
    void stop(0);
  };
  const terminated = () => {
    void stop(0);
  };
  process.on("SIGINT", interrupted);
  process.on("SIGTERM", terminated);

  function launch(service, failures = 0) {
    if (stopping) return;
    const started = Date.now();
    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: "inherit",
      windowsHide: true,
      detached: !windows,
      // Do not load backend credentials into the frontend environment.
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    children.add(child);
    log(`[dev] Started ${service.name}${child.pid ? ` (PID ${child.pid})` : ""}.`);
    child.once("error", (error) => {
      log(`[dev] Could not start ${service.name}: ${error.message}`);
      void stop(1);
    });
    child.once("exit", (code, signal) => {
      if (stopping) return;
      // Clean up a surviving process group before scheduling a replacement.
      void (async () => {
        await stopTree(child);
        children.delete(child);
        if (stopping) return;
        const attempts = Date.now() - started >= 60000 ? 0 : failures;
        if (service.restart && attempts < maxRestarts) {
          const delay = Math.min(30000, restartDelayMs * 2 ** attempts);
          log(
            `[dev] ${service.name} exited (${code ?? signal}); restarting in ${delay / 1000}s (${attempts + 1}/${maxRestarts}).`
          );
          const timer = setTimeout(() => {
            timers.delete(timer);
            launch(service, attempts + 1);
          }, delay);
          timers.add(timer);
        } else {
          log(
            `[dev] ${service.name} stopped (${code ?? signal}). Check its output above; stopping the stack.`
          );
          void stop(1);
        }
      })();
    });
  }
  for (const service of services) launch(service);
  return { done, stop };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const services = servicesFor(process.argv[2] || "all");
    await preflight(services);
    console.log(
      "[dev] Frontend http://localhost:3000 | API http://127.0.0.1:8000 | quiz worker included in full startup. Ctrl+C stops this session."
    );
    process.exitCode = await supervise(services).done;
  } catch (error) {
    console.error(`[dev] ${error.message}`);
    process.exitCode = 1;
  }
}
