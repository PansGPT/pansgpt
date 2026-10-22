"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { env } from "@/env";
import { localTodayIso } from "@pansgpt/ui/shell";

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
const taskSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    due_date: z.string(),
    due_time: z.string().nullable(),
    subtitle: z.string().nullable(),
  })
);
const timetableSchema = z.array(
  z.object({
    id: z.string(),
    course_title: z.string(),
    day: z.string(),
    start_time: z.string().nullable(),
    time_slot: z.string(),
    venue: z.string().nullable(),
  })
);
const completedSchema = z.array(z.object({ id: z.string(), completed_at: z.string() }));
type DashboardData = {
  recent: z.infer<typeof recentSchema>;
  recentSource: "history" | "library";
  tasks: z.infer<typeof taskSchema>;
  timetable: z.infer<typeof timetableSchema>;
  completed: z.infer<typeof completedSchema>;
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
  completed: [],
  activityError: false,
  loading: true,
  recentError: false,
  eventsError: false,
};
const DashboardContext = createContext<(DashboardData & { reload: () => void }) | null>(null);
const chatsSchema = z.object({
  sessions: z.array(z.object({ id: z.string().uuid(), title: z.string().nullable() })),
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
    const level = z
      .enum(["100", "200", "300", "400", "500", "600"])
      .safeParse(profile.current_level);
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
    void Promise.all([
      recentDocuments(),
      supabase
        .from("student_tasks")
        .select("id,title,due_date,due_time,subtitle")
        .eq("user_id", profile.id)
        .eq("university_id", university)
        .eq("is_completed", false)
        .gte("due_date", localTodayIso())
        .order("due_date")
        .order("due_time", { nullsFirst: false })
        .limit(30)
        .abortSignal(controller.signal),
      level.success
        ? supabase
            .from("timetables")
            .select("id,course_title,day,start_time,time_slot,venue")
            .eq("university_id", university)
            .eq("level", level.data)
            .abortSignal(controller.signal)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("student_tasks")
        .select("id,completed_at")
        .eq("user_id", profile.id)
        .eq("university_id", university)
        .eq("is_completed", true)
        .not("completed_at", "is", null)
        .gte("completed_at", new Date(Date.now() - 180 * 86400000).toISOString())
        .order("completed_at", { ascending: false })
        .limit(1000)
        .abortSignal(controller.signal),
    ])
      .then(([history, tasks, timetable, completed]) => {
        if (controller.signal.aborted) return;
        const recent = recentSchema.safeParse(history.data);
        const pending = taskSchema.safeParse(tasks.data);
        const classes = timetableSchema.safeParse(timetable.data);
        const activity = completedSchema.safeParse(completed.data);
        setData({
          completed: activity.success && !completed.error ? activity.data : [],
          activityError: Boolean(completed.error) || !activity.success,
          recent: recent.success && !history.error ? recent.data : [],
          recentSource: history.source,
          tasks: pending.success && !tasks.error ? pending.data : [],
          timetable: classes.success && !timetable.error ? classes.data : [],
          loading: false,
          recentError: Boolean(history.error) || !recent.success,
          eventsError:
            Boolean(tasks.error) ||
            Boolean(timetable.error) ||
            !pending.success ||
            !classes.success,
        });
      })
      .catch(() => {
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
  }, [attempt, profile.current_level, profile.id, profile.university_id, supabase]);
  function reload(): void {
    setData((value) => ({ ...value, loading: true }));
    setAttempt((value) => value + 1);
  }
  return (
    <DashboardContext.Provider value={{ ...data, reload }}>
      <ChatsContext.Provider value={chatData}>{children}</ChatsContext.Provider>
    </DashboardContext.Provider>
  );
}
export function useDashboard(): DashboardData & { reload: () => void } {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("Dashboard data requires a verified workspace.");
  return context;
}
export function useRecentChats(): RecentChats {
  const context = useContext(ChatsContext);
  if (!context) throw new Error("Recent chats require a verified workspace.");
  return context;
}
