"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  GraduationCap,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type {
  StudentTaskCreateRequest,
  StudentTaskDto,
  StudentTaskType,
  StudentTaskUpdateRequest,
} from "@pansgpt/types";
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
  } else {
    // Match weekday names (e.g. "by Friday", "on Monday")
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayRegex = /\b(?:on|by)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
    const dayMatch = cleanedTitle.match(dayRegex);
    if (dayMatch) {
      const targetDay = dayNames.indexOf(dayMatch[1].toLowerCase());
      const currentDay = now.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7;
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, "0");
      const d = String(targetDate.getDate()).padStart(2, "0");
      dueDate = `${y}-${m}-${d}`;
      cleanedTitle = cleanedTitle.replace(dayMatch[0], "").trim();
    }
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

  // Clean trailing prepositions like "by", "at", "due", "on"
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

function formatSidebarCreated(createdAtIso: string): string {
  try {
    const d = new Date(createdAtIso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
        if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
        return a.created_at.localeCompare(b.created_at);
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((task) => task.is_completed)
      .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
  }, [tasks]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const handleToggleComplete = async (task: StudentTaskDto) => {
    const nextCompleted = !task.is_completed;
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              is_completed: nextCompleted,
              completed_at: nextCompletedAt,
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

  const handleDeleteTask = async (taskId: string) => {
    const backup = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    try {
      if (!token) throw new Error("Authentication unavailable");
      await deleteTask(env.NEXT_PUBLIC_API_URL, token, taskId);
      reloadDashboard();
    } catch {
      setTasks(backup);
      setError("Failed to delete task.");
    }
  };

  const handleUpdateTask = async (taskId: string, updates: StudentTaskUpdateRequest) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));

    try {
      if (!token) throw new Error("Authentication unavailable");
      const updated = await updateTask(env.NEXT_PUBLIC_API_URL, token, taskId, updates);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      reloadDashboard();
    } catch {
      setError("Failed to save task update.");
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
      <div className={`planner-tasks-main ${selectedTask ? "has-sidebar" : ""}`}>
        <div className="planner-tasks-header">
          <div className="planner-tasks-title-group">
            <h2 className="planner-tasks-title">Tasks</h2>
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
                const isSelected = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`planner-task-row ${isSelected ? "is-selected" : ""}`}
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
                      onClick={() =>
                        setSelectedTaskId((prev) => (prev === task.id ? null : task.id))
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
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
                        {task.subtitle && (
                          <span className="planner-task-notes-indicator" title="Has notes">
                            <FileText size={11} />
                          </span>
                        )}
                      </div>
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
                        <div
                          key={task.id}
                          className={`planner-task-row is-completed ${
                            selectedTaskId === task.id ? "is-selected" : ""
                          }`}
                          role="listitem"
                        >
                          <button
                            type="button"
                            className="planner-task-checkbox is-checked"
                            aria-label={`Mark "${task.title}" as incomplete`}
                            onClick={() => handleToggleComplete(task)}
                          >
                            <Circle size={19} className="planner-task-circle" />
                            <Check size={13} className="planner-task-check-icon" />
                          </button>

                          <div
                            className="planner-task-content"
                            onClick={() =>
                              setSelectedTaskId((prev) => (prev === task.id ? null : task.id))
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
                              }
                            }}
                          >
                            <span className="planner-task-title-text">{task.title}</span>
                            {task.course_code && (
                              <div className="planner-task-meta">
                                <span className="planner-task-course-badge">
                                  {task.course_code}
                                </span>
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
      </div>

      {/* Right Task Detail Sidebar */}
      {selectedTask && (
        <TaskDetailSidebar
          key={selectedTask.id}
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleUpdateTask}
          onDelete={() => handleDeleteTask(selectedTask.id)}
          onToggleComplete={() => handleToggleComplete(selectedTask)}
        />
      )}
    </div>
  );
}

function TaskDetailSidebar({
  task,
  onClose,
  onUpdate,
  onDelete,
  onToggleComplete,
}: {
  task: StudentTaskDto;
  onClose: () => void;
  onUpdate: (taskId: string, updates: StudentTaskUpdateRequest) => Promise<void>;
  onDelete: () => void;
  onToggleComplete: () => void;
}): React.ReactElement {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [dueTime, setDueTime] = useState(task.due_time || "");
  const [courseCode, setCourseCode] = useState(task.course_code || "");
  const [taskType, setTaskType] = useState<StudentTaskType>(task.task_type || "custom");
  const [notes, setNotes] = useState(task.subtitle || "");

  useEffect(() => {
    setTitle(task.title);
    setDueDate(task.due_date);
    setDueTime(task.due_time || "");
    setCourseCode(task.course_code || "");
    setTaskType(task.task_type || "custom");
    setNotes(task.subtitle || "");
  }, [
    task.id,
    task.title,
    task.due_date,
    task.due_time,
    task.course_code,
    task.task_type,
    task.subtitle,
  ]);

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      void onUpdate(task.id, { title: trimmed });
    } else if (!trimmed) {
      setTitle(task.title);
    }
  };

  const handleDueDateChange = (newDate: string) => {
    if (!newDate) return;
    setDueDate(newDate);
    if (newDate !== task.due_date) {
      void onUpdate(task.id, { due_date: newDate });
    }
  };

  const handleDueTimeChange = (newTime: string) => {
    setDueTime(newTime);
    const normalized = newTime || null;
    if (normalized !== task.due_time) {
      void onUpdate(task.id, { due_time: normalized });
    }
  };

  const handleCourseCodeBlur = () => {
    const trimmed = courseCode.trim() || null;
    if (trimmed !== task.course_code) {
      void onUpdate(task.id, { course_code: trimmed });
    }
  };

  const handleTaskTypeChange = (newType: StudentTaskType) => {
    setTaskType(newType);
    if (newType !== task.task_type) {
      void onUpdate(task.id, { task_type: newType });
    }
  };

  const handleNotesBlur = () => {
    const trimmed = notes.trim() || null;
    if (trimmed !== task.subtitle) {
      void onUpdate(task.id, { subtitle: trimmed });
    }
  };

  const createdLabel = useMemo(() => formatSidebarCreated(task.created_at), [task.created_at]);

  return (
    <aside className="planner-task-sidebar" aria-label="Task details">
      <div className="planner-task-sidebar-header">
        <button
          type="button"
          className={`planner-task-checkbox ${task.is_completed ? "is-checked" : ""}`}
          aria-label={task.is_completed ? "Mark task as incomplete" : "Mark task as complete"}
          onClick={onToggleComplete}
        >
          <Circle size={20} className="planner-task-circle" />
          <Check size={13} className="planner-task-check-icon" />
        </button>

        <input
          type="text"
          className="planner-task-sidebar-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Task title"
          maxLength={200}
        />

        <button
          type="button"
          className="planner-task-sidebar-close"
          onClick={onClose}
          aria-label="Close task details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="planner-task-sidebar-body">
        {/* Properties Card */}
        <div className="planner-sidebar-section">
          {/* Due Date */}
          <div className="planner-sidebar-row">
            <span className="planner-sidebar-row-icon">
              <Calendar size={16} />
            </span>
            <div className="planner-sidebar-row-content">
              <span className="planner-sidebar-row-label">Due date</span>
              <input
                type="date"
                className="planner-sidebar-input"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
            </div>
          </div>

          {/* Due Time */}
          <div className="planner-sidebar-row">
            <span className="planner-sidebar-row-icon">
              <Clock size={16} />
            </span>
            <div className="planner-sidebar-row-content">
              <span className="planner-sidebar-row-label">Due time</span>
              <input
                type="time"
                className="planner-sidebar-input"
                value={dueTime}
                onChange={(e) => handleDueTimeChange(e.target.value)}
              />
            </div>
            {dueTime && (
              <button
                type="button"
                className="planner-sidebar-clear-btn"
                onClick={() => handleDueTimeChange("")}
                title="Clear time"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Course Code */}
          <div className="planner-sidebar-row">
            <span className="planner-sidebar-row-icon">
              <GraduationCap size={16} />
            </span>
            <div className="planner-sidebar-row-content">
              <span className="planner-sidebar-row-label">Course code</span>
              <input
                type="text"
                className="planner-sidebar-input"
                placeholder="e.g. PCO 301"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                onBlur={handleCourseCodeBlur}
                maxLength={30}
              />
            </div>
          </div>

          {/* Category */}
          <div className="planner-sidebar-row">
            <span className="planner-sidebar-row-icon">
              <Tag size={16} />
            </span>
            <div className="planner-sidebar-row-content">
              <span className="planner-sidebar-row-label">Category</span>
              <select
                className="planner-sidebar-select"
                value={taskType}
                onChange={(e) => handleTaskTypeChange(e.target.value as StudentTaskType)}
              >
                <option value="custom">General Task</option>
                <option value="assignment">Assignment</option>
                <option value="reading">Reading</option>
                <option value="lab">Lab Practical</option>
                <option value="presentation">Presentation</option>
                <option value="class">Class</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="planner-sidebar-section planner-sidebar-notes-card">
          <div className="planner-sidebar-notes-header">
            <FileText size={15} />
            <span>Notes</span>
          </div>
          <textarea
            className="planner-sidebar-notes-textarea"
            placeholder="Add details or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={5}
          />
        </div>
      </div>

      <div className="planner-task-sidebar-footer">
        <span className="planner-sidebar-created-text">Created on {createdLabel}</span>
        <button
          type="button"
          className="planner-sidebar-delete-btn"
          onClick={onDelete}
          aria-label="Delete task"
          title="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </aside>
  );
}
