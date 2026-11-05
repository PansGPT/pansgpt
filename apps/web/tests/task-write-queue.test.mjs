import test from "node:test";
import assert from "node:assert/strict";
import { TaskWriteQueue } from "../lib/task-write-queue.ts";

const task = (id, extra = {}) => ({
  id,
  title: id,
  subtitle: null,
  course_code: null,
  task_type: "custom",
  due_date: null,
  due_time: null,
  is_completed: false,
  is_favorite: false,
  completed_at: null,
  source: "custom",
  created_at: "2026-11-05T00:00:00Z",
  ...extra,
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function store(initial) {
  let rows = initial;
  const queue = new TaskWriteQueue(
    () => rows,
    (next) => {
      rows = next;
    }
  );
  return { queue, rows: () => rows, row: (id) => rows.find((item) => item.id === id) };
}

test("rapid edits to one task are sent in order and retain later optimistic fields", async () => {
  const s = store([task("a")]);
  const first = deferred(),
    second = deferred();
  const calls = [];
  const p1 = s.queue.patch("a", { title: "First edit" }, () => {
    calls.push("first");
    return first.promise;
  });
  const p2 = s.queue.patch("a", { is_favorite: true }, () => {
    calls.push("second");
    return second.promise;
  });
  assert.deepEqual(calls, ["first"]);
  first.resolve(task("a", { title: "First edit" }));
  await p1;
  assert.equal(s.row("a").is_favorite, true);
  assert.deepEqual(calls, ["first", "second"]);
  second.resolve(task("a", { title: "First edit", is_favorite: true }));
  await p2;
  assert.equal(s.row("a").title, "First edit");
  assert.equal(s.queue.isIdle, true);
});

test("a failed edit cannot undo another task's successful save", async () => {
  const s = store([task("a"), task("b")]);
  const failed = deferred();
  const p1 = s.queue.patch("a", { title: "Failed edit" }, () => failed.promise);
  const rejection = assert.rejects(p1, /unavailable/);
  await s.queue.patch("b", { title: "Saved edit" }, async () => task("b", { title: "Saved edit" }));
  failed.reject(new Error("unavailable"));
  await rejection;
  assert.equal(s.row("a").title, "a");
  assert.equal(s.row("b").title, "Saved edit");
});

test("completion uses the server timestamp and failed reopen restores the timestamp", async () => {
  const s = store([task("a")]);
  const response = deferred();
  const complete = s.queue.patch("a", { is_completed: true }, () => response.promise);
  assert.equal(s.row("a").completed_at, null);
  response.resolve(task("a", { is_completed: true, completed_at: "2026-11-05T09:01:00Z" }));
  await complete;
  const reopen = s.queue.patch("a", { is_completed: false }, async () => {
    throw new Error("offline");
  });
  await assert.rejects(reopen);
  assert.equal(s.row("a").is_completed, true);
  assert.equal(s.row("a").completed_at, "2026-11-05T09:01:00Z");
});

test("failed deletion restores only its task, including a prior successful edit", async () => {
  const s = store([task("a"), task("b")]);
  await s.queue.patch("a", { title: "Saved title" }, async () =>
    task("a", { title: "Saved title" })
  );
  const failed = deferred();
  const deletion = s.queue.remove("a", () => failed.promise);
  const rejection = assert.rejects(deletion);
  assert.equal(s.row("a"), undefined);
  await s.queue.patch("b", { is_favorite: true }, async () => task("b", { is_favorite: true }));
  failed.reject(new Error("offline"));
  await rejection;
  assert.equal(s.row("a").title, "Saved title");
  assert.equal(s.row("b").is_favorite, true);
});

test("a failed first edit does not erase a queued second edit", async () => {
  const s = store([task("a")]);
  const first = deferred();
  const one = s.queue.patch("a", { title: "Rejected" }, () => first.promise);
  const rejected = assert.rejects(one);
  const two = s.queue.patch("a", { is_favorite: true }, async () =>
    task("a", { is_favorite: true })
  );
  first.reject(new Error("offline"));
  await rejected;
  await two;
  assert.equal(s.row("a").title, "a");
  assert.equal(s.row("a").is_favorite, true);
});

test("account disposal rejects queued changes and ignores late responses", async () => {
  const s = store([task("a")]);
  const first = deferred();
  let sentSecond = false;
  const one = s.queue.patch("a", { title: "Old account" }, () => first.promise);
  const two = s.queue.patch("a", { is_favorite: true }, async () => {
    sentSecond = true;
    return task("a");
  });
  const settled = Promise.allSettled([one, two]);
  s.queue.dispose();
  const previous = s.rows();
  first.resolve(task("a", { title: "Late response" }));
  assert.deepEqual(
    (await settled).map((item) => item.status),
    ["rejected", "rejected"]
  );
  assert.equal(s.rows(), previous);
  assert.equal(sentSecond, false);
});
