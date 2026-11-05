import type { StudentTaskDto, StudentTaskUpdateRequest } from "@pansgpt/types";

type Change = {
  patch: StudentTaskUpdateRequest | null;
  save: () => Promise<StudentTaskDto | null>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type PendingTask = {
  id: string;
  confirmed: StudentTaskDto | null;
  changes: Change[];
};

/** Serialize each task's writes and project pending changes over confirmed data. */
export class TaskWriteQueue {
  private readonly pending = new Map<string, PendingTask>();
  private active = true;
  private revision = 0;
  private readonly read: () => StudentTaskDto[];
  private readonly publish: (tasks: StudentTaskDto[]) => void;

  constructor(read: () => StudentTaskDto[], publish: (tasks: StudentTaskDto[]) => void) {
    this.read = read;
    this.publish = publish;
  }

  get isActive(): boolean {
    return this.active;
  }
  get isIdle(): boolean {
    return this.pending.size === 0;
  }
  get version(): number {
    return this.revision;
  }

  patch(
    id: string,
    patch: StudentTaskUpdateRequest,
    save: () => Promise<StudentTaskDto>
  ): Promise<void> {
    return this.enqueue(id, patch, save);
  }

  remove(id: string, save: () => Promise<void>): Promise<void> {
    return this.enqueue(id, null, async () => {
      await save();
      return null;
    });
  }

  replace(tasks: StudentTaskDto[]): void {
    if (!this.active) return;
    let projected = tasks;
    for (const entry of this.pending.values()) projected = this.project(projected, entry);
    this.publish(projected);
  }

  dispose(): void {
    this.active = false;
    for (const entry of this.pending.values()) {
      for (const change of entry.changes) change.reject(new Error("Task account changed."));
      entry.changes = [];
    }
    this.pending.clear();
  }

  private enqueue(
    id: string,
    patch: StudentTaskUpdateRequest | null,
    save: Change["save"]
  ): Promise<void> {
    if (!this.active) return Promise.reject(new Error("Task account changed."));
    let entry = this.pending.get(id);
    if (!entry) {
      const task = this.read().find((item) => item.id === id);
      if (!task) return Promise.reject(new Error("Task is no longer available."));
      entry = { id, confirmed: task, changes: [] };
      this.pending.set(id, entry);
    }
    const target = entry;
    const promise = new Promise<void>((resolve, reject) => {
      target.changes.push({ patch, save, resolve, reject });
    });
    this.revision += 1;
    this.publish(this.project(this.read(), target));
    if (target.changes.length === 1) void this.drain(target);
    return promise;
  }

  private project(tasks: StudentTaskDto[], entry: PendingTask): StudentTaskDto[] {
    let task = entry.confirmed;
    for (const change of entry.changes) {
      if (change.patch === null) task = null;
      else if (task) {
        task = {
          ...task,
          ...change.patch,
          ...(change.patch.is_completed === false ? { completed_at: null } : {}),
        };
      }
    }
    const others = tasks.filter((item) => item.id !== entry.id);
    return task ? [...others, task] : others;
  }

  private async drain(entry: PendingTask): Promise<void> {
    while (this.active && entry.changes.length) {
      const change = entry.changes[0];
      let error: unknown;
      let failed = false;
      try {
        entry.confirmed = await change.save();
      } catch (failure) {
        error = failure;
        failed = true;
      }
      if (!this.active) return;
      entry.changes.shift();
      if (!entry.changes.length) this.pending.delete(entry.id);
      this.publish(this.project(this.read(), entry));
      if (failed) change.reject(error);
      else change.resolve();
    }
  }
}
