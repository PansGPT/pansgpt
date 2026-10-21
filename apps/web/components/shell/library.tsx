"use client";
import { useEffect, useState } from "react";
import { BookOpen, FileText, RefreshCw, Upload } from "lucide-react";
import { z } from "zod";
import { Button, Input } from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { WorkspaceLoading } from "./loading";

const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  course_code: z.string().nullish(),
  status: z.string(),
  embedding_status: z.string().nullish(),
});
type LibraryDocument = z.infer<typeof documentSchema>;
export function WorkspaceLibrary({
  initialQuery = "",
}: {
  initialQuery?: string;
}): React.ReactElement {
  const { session, profile } = useAuth();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [uploadOpen, setUploadOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/library/documents`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Library unavailable");
        const data: unknown = await response.json();
        const parsed = z.array(documentSchema).parse(data);
        if (!controller.signal.aborted) {
          setDocuments(parsed);
          setState("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [attempt, session?.access_token]);
  function reload(): void {
    setState("loading");
    setDocuments([]);
    setAttempt((value) => value + 1);
  }
  const matches = documents.filter((item) =>
    `${item.title} ${item.course_code ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const canUpload =
    profile && ["lecturer", "university_admin", "super_admin"].includes(profile.role);
  return (
    <section className="workspace-library">
      <header className="workspace-section-heading">
        <div>
          <span className="shell-eyebrow">A place to begin</span>
          <h1>Your library</h1>
          <p>Your university&apos;s course materials, together in one place.</p>
        </div>
        {canUpload && (
          <Button
            leadingIcon={<Upload size={16} />}
            trailingIcon={null}
            onClick={() => setUploadOpen(true)}
          >
            Upload material
          </Button>
        )}
      </header>
      <div className="library-toolbar">
        <Input
          label="Search your library"
          placeholder="Search titles or course codes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          variant="secondary"
          leadingIcon={<RefreshCw size={16} />}
          trailingIcon={null}
          disabled={state === "loading"}
          onClick={reload}
        >
          Refresh
        </Button>
      </div>
      {state === "loading" ? (
        <WorkspaceLoading />
      ) : state === "error" ? (
        <div className="shell-empty" role="alert">
          <h2>We couldn&apos;t load your library</h2>
          <p>Please try again in a moment.</p>
          <Button variant="secondary" leadingIcon={null} trailingIcon={null} onClick={reload}>
            Retry library
          </Button>
        </div>
      ) : matches.length ? (
        <ul className="library-documents" aria-label="Course documents">
          {matches.map((item) => (
            <li key={item.id}>
              <span className="library-document-icon">
                <FileText size={22} aria-hidden="true" />
              </span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.course_code || "Course material"}</p>
              </div>
              <span className="library-document-status">
                {item.status === "active" || item.embedding_status === "completed"
                  ? "Ready"
                  : item.status.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="shell-empty">
          <BookOpen size={30} aria-hidden="true" />
          <h2>{query ? "No matching materials" : "Your library has room to grow"}</h2>
          <p>
            {query
              ? "Try another title or course code."
              : "Course materials will appear here when your university shares them."}
          </p>
        </div>
      )}
      {canUpload && (
        <DocumentUploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploadSuccess={reload}
          userRole={profile.role}
          token={session?.access_token}
        />
      )}
    </section>
  );
}
