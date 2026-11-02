"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { StudentTaskCreateRequest, StudentTaskDto } from "@pansgpt/types";
import { env } from "@/env";
import { useAuth } from "@/lib/auth-context";
import { createTask, deleteTask, getTasks, updateTask } from "@/lib/academic";
import { useDashboard } from "./dashboard-data";

function localTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseNaturalDue(
  rawText: string,
  todayIso: string
): {
  title: string;
  dueDate: string;
  dueTime: string | null;
} {
  const text = rawText.trim();
  let dueDate = todayIso;
  let dueTime: string | null = null;
  let cleanedTitle = text;

  const now = new Date();

  // Match "tomorrow"
  if (/\btomorrow\b/i.test(cleanedTitle)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    dueDate = `${y}-${m}-${d}`;
    cleanedTitle = cleanedTitle.replace(/\btomorrow\b/i, "").trim();
  } else if (/\btoday\b/i.test(cleanedTitle)) {
    cleanedTitle = cleanedTitle.replace(/\btoday\b/i, "").trim();
  }

  // Match time e.g. "by 5pm", "at 6:30pm", "9am"
  const timeMatch = cleanedTitle.match(/\b(?:by|at)?\s*(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPm = timeMatch[3].toLowerCase() === "pm";

    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;

    dueTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    cleanedTitle = cleanedTitle.replace(timeMatch[0], "").trim();
  }

  // Clean trailing prepositions like "by", "at", "due"
  cleanedTitle = cleanedTitle.replace(/\b(by|at|due|on)\s*$/i, "").trim();

  return {
    title: cleanedTitle || text,
    dueDate,
    dueTime,
  };
}

function formatTaskDue(
  dueDate: string,
  dueTime: string | null,
  todayIso: string
): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
} {
  const isToday = dueDate === todayIso;
  const isOverdue = dueDate < todayIso;

  let timeFormatted = "";
  if (dueTime) {
    const parts = dueTime.split(":");
    let hour = parseInt(parts[0], 10);
    const min = parts[1] || "00";
    const ampm = hour >= 12 ? "pm" : "am";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    timeFormatted = `${hour}:${min} ${ampm}`;
  }

  if (isToday) {
    return {
      label: timeFormatted ? `Today, ${timeFormatted}` : "Today",
      isOverdue: false,
      isToday: true,
    };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  if (dueDate === tomorrowIso) {
    return {
      label: timeFormatted ? `Tomorrow, ${timeFormatted}` : "Tomorrow",
      isOverdue: false,
      isToday: false,
    };
  }

  // Format month and day
  const dateObj = new Date(`${dueDate}T00:00:00`);
  const month = dateObj.toLocaleDateString("en-US", { month: "short" });
  const day = dateObj.getDate();
  const dateLabel = `${month} ${day}`;

  if (isOverdue) {
    return {
      label: `Overdue · ${dateLabel}`,
      isOverdue: true,
      isToday: false,
    };
  }

  return {
    label: timeFormatted ? `${dateLabel}, ${timeFormatted}` : dateLabel,
    isOverdue: false,
    isToday: false,
  };
}

export function TasksModalView(): React.ReactElement {
  const { session } = useAuth();
  const token = session?.access_token;
  const { reload: reloadDashboard } = useDashboard();

  const [tasks, setTasks] = useState<StudentTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [completedOpen, setCompletedOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingTask, setEditingTask] = useState<StudentTaskDto | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const todayIso = useMemo(() => localTodayIso(), []);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTasks(env.NEXT_PUBLIC_API_URL, token, true);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.is_completed)
      .sort((a, b) => {
        // Starred first
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        // Then by due date
        if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
        return a.created_at.localeCompare(b.created_at);
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((task) => task.is_completed)
      .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
  }, [tasks]);

  const handleToggleComplete = async (task: StudentTaskDto) => {
    const nextCompleted = !task.is_completed;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              is_completed: nextCompleted,
              completed_at: nextCompleted ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      if (!token) throw new Error("Authentication unavailable");
      await updateTask(env.NEXT_PUBLIC_API_URL, token, task.id, {
        is_completed: nextCompleted,
      });
      reloadDashboard();
    } catch (err) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: task.is_completed } : t))
      );
      setError("Failed to update task completion.");
    }
  };

  const handleToggleFavorite = async (task: StudentTaskDto) => {
    const nextFav = !task.is_favorite;
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_favorite: nextFav } : t)));

    try {
      if (!token) throw new Error("Authentication unavailable");
      await updateTask(env.NEXT_PUBLIC_API_URL, token, task.id, {
        is_favorite: nextFav,
      });
    } catch {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_favorite: task.is_favorite } : t))
      );
      setError("Failed to update task star.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const backup = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (editingTask?.id === taskId) setEditingTask(null);

    try {
      if (!token) throw new Error("Authentication unavailable");
      await deleteTask(env.NEXT_PUBLIC_API_URL, token, taskId);
      reloadDashboard();
    } catch {
      setTasks(backup);
      setError("Failed to delete task.");
    }
  };

  const handleAddTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = newTaskText.trim();
    if (!text || submitting || !token) return;

    setSubmitting(true);
    const parsed = parseNaturalDue(text, todayIso);

    const payload: StudentTaskCreateRequest = {
      title: parsed.title,
      due_date: parsed.dueDate,
      due_time: parsed.dueTime,
      task_type: "custom",
    };

    try {
      const created = await createTask(env.NEXT_PUBLIC_API_URL, token, payload);
      setTasks((prev) => [created, ...prev]);
      setNewTaskText("");
      reloadDashboard();
      // Keep adding bar open and focused for rapid entry
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="planner-tasks-view">
      <div className="planner-tasks-header">
        <div className="planner-tasks-title-group">
          <h2 className="planner-tasks-title">Tasks</h2>
          <span className="planner-tasks-count-pill">{activeTasks.length} pending</span>
        </div>
      </div>

      {error && (
        <div className="planner-tasks-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="planner-tasks-scroll-content">
        {loading && !tasks.length ? (
          <div className="planner-tasks-loading">
            <div className="planner-task-skeleton" />
            <div className="planner-task-skeleton" />
            <div className="planner-task-skeleton" />
          </div>
        ) : !loading && !tasks.length ? (
          <div className="planner-tasks-empty">
            <span className="planner-tasks-empty-circle">
              <Circle size={24} />
            </span>
            <h3>No tasks yet</h3>
            <p>Add study goals, readings, or assignments below to stay on track.</p>
          </div>
        ) : (
          <div className="planner-tasks-list" role="list">
            {activeTasks.map((task) => {
              const dueInfo = formatTaskDue(task.due_date, task.due_time, todayIso);
              return (
                <div
                  key={task.id}
                  className={`planner-task-row ${task.is_favorite ? "is-favorite" : ""}`}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="planner-task-checkbox"
                    aria-label={`Mark "${task.title}" as complete`}
                    onClick={() => handleToggleComplete(task)}
                  >
                    <Circle size={19} className="planner-task-circle" />
                    <Check size={13} className="planner-task-check-icon" />
                  </button>

                  <div
                    className="planner-task-content"
                    onClick={() => setEditingTask(task)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditingTask(task);
                      }
                    }}
                  >
                    <span className="planner-task-title-text">{task.title}</span>
                    <div className="planner-task-meta">
                      {task.course_code && (
                        <span className="planner-task-course-badge">{task.course_code}</span>
                      )}
                      <span
                        className={`planner-task-due-badge ${
                          dueInfo.isOverdue ? "is-overdue" : dueInfo.isToday ? "is-today" : ""
                        }`}
                      >
                        {dueInfo.isOverdue && <Clock size={11} />}
                        {dueInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="planner-task-actions">
                    <button
                      type="button"
                      className={`planner-task-star-btn ${task.is_favorite ? "is-active" : ""}`}
                      aria-label={task.is_favorite ? "Unstar task" : "Star task"}
                      onClick={() => handleToggleFavorite(task)}
                    >
                      <Star size={17} fill={task.is_favorite ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      className="planner-task-delete-btn"
                      aria-label="Delete task"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Collapsible Completed Section */}
            {completedTasks.length > 0 && (
              <div className="planner-tasks-completed-section">
                <button
                  type="button"
                  className="planner-tasks-completed-toggle"
                  onClick={() => setCompletedOpen((prev) => !prev)}
                  aria-expanded={completedOpen}
                >
                  {completedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span>Completed</span>
                  <span className="planner-tasks-completed-count">{completedTasks.length}</span>
                </button>

                {completedOpen && (
                  <div className="planner-tasks-completed-list">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="planner-task-row is-completed" role="listitem">
                        <button
                          type="button"
                          className="planner-task-checkbox is-checked"
                          aria-label={`Mark "${task.title}" as incomplete`}
                          onClick={() => handleToggleComplete(task)}
                        >
                          <Circle size={19} className="planner-task-circle" />
                          <Check size={13} className="planner-task-check-icon" />
                        </button>

                        <div className="planner-task-content">
                          <span className="planner-task-title-text">{task.title}</span>
                          {task.course_code && (
                            <div className="planner-task-meta">
                              <span className="planner-task-course-badge">{task.course_code}</span>
                            </div>
                          )}
                        </div>

                        <div className="planner-task-actions">
                          <button
                            type="button"
                            className="planner-task-delete-btn"
                            aria-label="Delete task"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline "+ Add a task" Bar */}
      <div className="planner-tasks-footer">
        {isAdding ? (
          <form className="planner-task-add-form" onSubmit={handleAddTask}>
            <span className="planner-task-add-circle">
              <Circle size={18} />
            </span>
            <input
              ref={inputRef}
              type="text"
              className="planner-task-add-input"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Try typing 'Study Pharmacology by Friday 6pm'"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (!newTaskText) setIsAdding(false);
                }
              }}
            />
            <div className="planner-task-add-controls">
              <button
                type="submit"
                className="planner-task-add-submit-btn"
                disabled={submitting || !newTaskText.trim()}
              >
                {submitting ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                className="planner-task-add-cancel-btn"
                onClick={() => {
                  setIsAdding(false);
                  setNewTaskText("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="planner-task-add-trigger"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={17} />
            <span>Add a task</span>
          </button>
        )}
      </div>

      {/* Task Detail Modal / Edit Dialog */}
      {editingTask && (
        <TaskDetailDialog
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={async (updated) => {
            if (!token) return;
            try {
              const res = await updateTask(env.NEXT_PUBLIC_API_URL, token, editingTask.id, updated);
              setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? res : t)));
              setEditingTask(null);
              reloadDashboard();
            } catch (err) {
              setError("Failed to save task updates.");
            }
          }}
          onDelete={() => handleDeleteTask(editingTask.id)}
        />
      )}
    </div>
  );
}

function TaskDetailDialog({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: StudentTaskDto;
  onClose: () => void;
  onSave: (payload: {
    title?: string;
    due_date?: string;
    course_code?: string | null;
  }) => Promise<void>;
  onDelete: () => void;
}): React.ReactElement {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [courseCode, setCourseCode] = useState(task.course_code || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      due_date: dueDate,
      course_code: courseCode.trim() || null,
    });
    setSaving(false);
  };

  return (
    <div className="planner-task-detail-overlay" onClick={onClose}>
      <div className="planner-task-detail-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="planner-task-detail-header">
          <h3>Task details</h3>
          <button type="button" onClick={onClose} aria-label="Close task details">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="planner-task-detail-form">
          <label>
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </label>

          <div className="planner-task-detail-row">
            <label>
              <span>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Course code</span>
              <input
                type="text"
                placeholder="e.g. PCO 301"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                maxLength={30}
              />
            </label>
          </div>

          <div className="planner-task-detail-footer">
            <button type="button" className="planner-task-detail-delete-btn" onClick={onDelete}>
              Delete
            </button>
            <div className="planner-task-detail-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="planner-task-detail-save-btn"
                disabled={saving || !title.trim()}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
