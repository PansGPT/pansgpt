import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { preflight, servicesFor, supervise } from "./dev.mjs";

test("startup includes worker and refuses occupied ports", async () => {
  assert.deepEqual(
    servicesFor().map((s) => s.name),
    ["api", "worker", "web"]
  );
  assert.throws(() => servicesFor("unknown"));
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    await assert.rejects(
      preflight([{ name: "fixture", command: process.execPath, port: server.address().port }]),
      /already in use/
    );
    assert.equal(server.listening, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("worker crash restarts and shutdown removes descendants", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pansgpt-dev-test-"));
  const script = path.join(directory, "worker.cjs");
  const state = path.join(directory, "starts.txt");
  await writeFile(
    script,
    `
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const state = process.argv[2];
if (!fs.existsSync(state)) { fs.writeFileSync(state, 'first\\n'); process.exit(1); }
const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio:'ignore', windowsHide:true});
fs.appendFileSync(state, process.pid + ',' + child.pid + '\\n');
process.on('SIGTERM', () => { child.once('exit', () => process.exit(0)); child.kill(); });
setInterval(() => {}, 1000);
`
  );
  const runner = supervise(
    [
      {
        name: "worker",
        command: process.execPath,
        args: [script, state],
        cwd: directory,
        restart: true,
      },
    ],
    { restartDelayMs: 10, log: () => {} }
  );
  try {
    let before = "";
    for (let i = 0; i < 100; i++) {
      try {
        before = await readFile(state, "utf8");
      } catch {
        /* Not started. */
      }
      if (before.trim().split("\n").length === 2) break;
      await delay(50);
    }
    assert.equal(before.trim().split("\n").length, 2);
    const pids = before.trim().split("\n")[1].split(",").map(Number);
    assert.equal(await runner.stop(), 0);
    await delay(100);
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), /ESRCH/);
    assert.equal(await readFile(state, "utf8"), before);
  } finally {
    await runner.stop();
    assert.ok(directory.startsWith(path.join(os.tmpdir(), "pansgpt-dev-test-")));
    await rm(directory, { recursive: true, force: true });
  }
});

test("persistent worker failures exhaust a bounded restart budget", async () => {
  const messages = [];
  const runner = supervise(
    [{ name: "worker", command: process.execPath, args: ["-e", "process.exit(1)"], restart: true }],
    { restartDelayMs: 10, maxRestarts: 2, log: (m) => messages.push(m) }
  );
  assert.equal(await runner.done, 1);
  assert.equal(messages.filter((m) => m.includes("restarting")).length, 2);
});
