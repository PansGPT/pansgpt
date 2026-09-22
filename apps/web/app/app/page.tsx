"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserInitialsAvatar } from "@/components/UserInitialsAvatar";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import {
  GraduationCap,
  MessageSquare,
  Upload,
  LogOut,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  ChevronRight,
  Shield,
  Loader2,
} from "lucide-react";

interface DocumentItem {
  id: string;
  university_id: string;
  title: string;
  course_code: string;
  course_title?: string;
  status: string;
  embedding_status: string;
  embedding_progress: number;
  created_at?: string;
}

export default function AppHomePage() {
  const router = useRouter();
  const { user, session, profile, loading: authLoading, signOut } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingDocs(true);
    setBackendOffline(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/library/documents`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        setBackendOffline(false);
      } else {
        setDocuments([]);
      }
    } catch {
      // Backend is unreachable or not started yet on port 8000
      setBackendOffline(true);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.access_token) {
      fetchDocuments();
    }
  }, [session, fetchDocuments]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Student";
  const userRole = profile?.role || "student";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">PansGPT</span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Walking Skeleton
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                AI Clinical Pharmacy Companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div>
                <div className="text-sm font-semibold leading-tight">{fullName}</div>
                <div className="flex items-center justify-end gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <Building2 className="w-3 h-3" />
                  <span>{profile?.university_name || "Pharmacy Student"}</span>
                  {profile?.current_level && (
                    <>
                      <span>•</span>
                      <span>{profile.current_level} Level</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <UserInitialsAvatar name={fullName} email={user?.email} size="md" />

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="rounded-xl border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Onboarding Notice Banner if profile incomplete */}
        {profile && !profile.is_onboarded && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/80 dark:bg-amber-950/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Student Profile Incomplete
                </h2>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Please complete your university and academic level setup to unlock all curriculum
                  features.
                </p>
              </div>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 transition-colors"
            >
              Complete Profile
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Hero Action Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/app/chat"
            className="group relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-xs hover:border-emerald-400 hover:shadow-md dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-neutral-900 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Start AI Study Session
            </h2>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Ask clinical questions, explore drug monographs, and master pharmacotherapy with
              real-time SSE streaming.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Launch Chat
              <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="group text-left relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-md shadow-neutral-900/20 group-hover:scale-105 dark:bg-neutral-800 dark:text-neutral-200 transition-transform">
              <Upload className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Upload Material
            </h2>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Upload institutional lecture notes or monographs for multi-stage RAG ingestion and
              vector search.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Open Upload Dialog
              <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Governance & Integrity
            </h2>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              PansGPT strictly enforces multi-tenant university data isolation and Zero Data
              Retention (ZDR) policy.
            </p>
            <div className="mt-4 text-[11px] font-medium text-blue-600 dark:text-blue-400">
              Role: <span className="uppercase font-bold">{userRole}</span>
            </div>
          </div>
        </div>

        {/* Recent Documents Table Section */}
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Institutional Course Documents
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Curriculum materials indexed and searchable in your academic library
              </p>
            </div>
            <button
              onClick={fetchDocuments}
              disabled={loadingDocs}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingDocs ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {backendOffline ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Backend API Offline
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  FastAPI service is not currently running on port 8000. Start the backend in your
                  terminal with{" "}
                  <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-600">
                    pnpm run dev
                  </code>{" "}
                  to connect library materials.
                </p>
                <button
                  onClick={fetchDocuments}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Connection
                </button>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
                <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {loadingDocs ? "Loading documents..." : "No documents found"}
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  {loadingDocs
                    ? "Fetching institutional documents from the library engine..."
                    : "No documents have been uploaded for your institution yet. University admins and lecturers can upload materials above."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-100 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-3">Document Title</th>
                    <th className="px-6 py-3">Course Code</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Vector Status</th>
                    <th className="px-6 py-3">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30"
                    >
                      <td className="px-6 py-3.5 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {doc.course_code}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {doc.embedding_status === "completed" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready (100%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            {doc.embedding_status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-neutral-500 dark:text-neutral-400">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchDocuments}
        userRole={userRole}
        token={session?.access_token}
      />
    </div>
  );
}
