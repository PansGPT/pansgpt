"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { env } from "@/env";
import { chatSessionSummarySchema } from "@/lib/chat-sessions";
import type { HomeDashboardDto } from "@pansgpt/types";
import { browserTimezone, getHomeDashboard, updateTask } from "@/lib/academic";

const recentSchema = z.array(
  z.object({
    updated_at: z.string(),
    documents: z.object({
      id: z.string(),
      title: z.string(),
      course_code: z.string().nullable(),
      updated_at: z.string().optional(),
    }),
  })
);
const libraryPreviewSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    course_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
);
type DashboardData = {
  recent: z.infer<typeof recentSchema>;
  recentSource: "history" | "library";
  tasks: HomeDashboardDto["tasks"];
  timetable: HomeDashboardDto["timetable"];
  dailyActivity: HomeDashboardDto["daily_activity"];
  today: string;
  activityFrom: string;
  currentStreakDays: number;
  activityError: boolean;
  loading: boolean;
  recentError: boolean;
  eventsError: boolean;
};
const initial: DashboardData = {
  recent: [],
  recentSource: "history",
  tasks: [],
  timetable: [],
  dailyActivity: [],
  today: "",
  activityFrom: "",
  currentStreakDays: 0,
  activityError: false,
  loading: true,
  recentError: false,
  eventsError: false,
};
type DashboardActions = {
  reload: () => void;
  completeTask: (taskId: string, completed: boolean) => Promise<void>;
};
const DashboardContext = createContext<(DashboardData & DashboardActions) | null>(null);
const chatsSchema = z.object({
  sessions: z.array(chatSessionSummarySchema),
});
type RecentChats = {
  chats: z.infer<typeof chatsSchema>["sessions"];
  loading: boolean;
  error: boolean;
};
const ChatsContext = createContext<RecentChats | null>(null);
export function DashboardProvider({
  profile,
  children,
}: {
  profile: UserProfile;
  children: ReactNode;
}): React.ReactElement {
  const [supabase] = useState(createClient);
  const [data, setData] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const { session } = useAuth();
  const pathname = usePathname();
  const token = session?.access_token;
  const [chatData, setChatData] = useState<RecentChats>({ chats: [], loading: true, error: false });
  useEffect(() => {
    const controller = new AbortController();
    async function loadChats(): Promise<void> {
      try {
        if (!token) throw new Error("Session unavailable");
        const response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat/sessions?limit=30`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error("Chat history unavailable");
        const result = chatsSchema.parse(await response.json());
        if (!controller.signal.aborted)
          setChatData({ chats: result.sessions, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted) setChatData({ chats: [], loading: false, error: true });
      }
    }
    void loadChats();
    return () => controller.abort();
  }, [token, attempt, pathname]);
  useEffect(() => {
    const controller = new AbortController();
    const university = profile.university_id;
    if (!university) {
      queueMicrotask(() => {
        if (!controller.signal.aborted)
          setData({
            ...initial,
            loading: false,
            recentError: true,
            eventsError: true,
            activityError: true,
          });
      });
      return () => controller.abort();
    }
    const universityId = university;
    async function recentDocuments(): Promise<{
      data: z.infer<typeof recentSchema>;
      error: boolean;
      source: "history" | "library";
    }> {
      const history = await supabase
        .from("study_progress")
        .select("updated_at,documents!inner(id,title,course_code,updated_at)")
        .eq("user_id", profile.id)
        .eq("documents.university_id", universityId)
        .eq("documents.status", "active")
        .is("documents.deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(6)
        .abortSignal(controller.signal);
      const parsedHistory = recentSchema.safeParse(history.data);
      if (history.error || !parsedHistory.success)
        return { data: [], error: true, source: "history" };
      if (parsedHistory.data.length)
        return { data: parsedHistory.data, error: false, source: "history" };
      const catalog = await supabase
        .from("documents")
        .select("id,title,course_code,created_at,updated_at")
        .eq("university_id", universityId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(6)
        .abortSignal(controller.signal);
      const parsedCatalog = libraryPreviewSchema.safeParse(catalog.data);
      if (catalog.error || !parsedCatalog.success)
        return { data: [], error: true, source: "library" };
      return {
        data: parsedCatalog.data.map(({ created_at, ...document }) => ({
          updated_at: created_at,
          documents: document,
        })),
        error: false,
        source: "library",
      };
    }
    async function loadActivities(): Promise<HomeDashboardDto> {
      if (!token) throw new Error("Session unavailable");
      return getHomeDashboard(env.NEXT_PUBLIC_API_URL, token, browserTimezone(), controller.signal);
    }
    void Promise.allSettled([recentDocuments(), loadActivities()]).then(
      ([historyResult, activityResult]) => {
        if (controller.signal.aborted) return;
        const history =
          historyResult.status === "fulfilled"
            ? historyResult.value
            : { data: [], error: true, source: "history" as const };
        const dashboard = activityResult.status === "fulfilled" ? activityResult.value : null;
        const recent = recentSchema.safeParse(history.data);
        setData({
          dailyActivity: dashboard?.daily_activity ?? [],
          today: dashboard?.today ?? "",
          activityFrom: dashboard?.activity_from ?? "",
          currentStreakDays: dashboard?.current_streak_days ?? 0,
          activityError: !dashboard,
          recent: recent.success && !history.error ? recent.data : [],
          recentSource: history.source,
          tasks: dashboard?.tasks ?? [],
          timetable: dashboard?.timetable ?? [],
          loading: false,
          recentError: Boolean(history.error) || !recent.success,
          eventsError: !dashboard,
        });
      }
    );
    return () => controller.abort();
  }, [attempt, profile.id, profile.university_id, supabase, token]);
  const reload = useCallback((): void => {
    setData((value) => ({ ...value, loading: true }));
    setAttempt((value) => value + 1);
  }, []);
  const completeTask = useCallback(
    async (taskId: string, completed: boolean): Promise<void> => {
      if (!token) throw new Error("Session unavailable");
      const previousTasks = data.tasks;
      setData((value) => ({
        ...value,
        tasks: value.tasks.map((task) =>
          task.id === taskId ? { ...task, is_completed: completed } : task
        ),
      }));
      try {
        await updateTask(env.NEXT_PUBLIC_API_URL, token, taskId, { is_completed: completed });
        setAttempt((value) => value + 1);
      } catch (error) {
        setData((value) => ({ ...value, tasks: previousTasks }));
        throw error;
      }
    },
    [data.tasks, token]
  );
  return (
    <DashboardContext.Provider value={{ ...data, reload, completeTask }}>
      <ChatsContext.Provider value={chatData}>{children}</ChatsContext.Provider>
    </DashboardContext.Provider>
  );
}
export function useDashboard(): DashboardData & DashboardActions {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("Dashboard data requires a verified workspace.");
  return context;
}
export function useRecentChats(): RecentChats {
  const context = useContext(ChatsContext);
  if (!context) throw new Error("Recent chats require a verified workspace.");
  return context;
}
