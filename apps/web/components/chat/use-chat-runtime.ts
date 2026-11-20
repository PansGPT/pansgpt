"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExternalStoreRuntime,
  ExportedMessageRepository,
  bindExternalStoreMessage,
  type AppendMessage,
  type AttachmentAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type {
  ChatMessageView,
  ChatActionMode,
  ChatStreamRequest,
  ChatFeedbackRequest,
  ChatBranchRequest,
  ChatSessionCreateRequest,
  ArtifactItem,
  ChatMessageContext,
  ChatLibrarySource,
} from "@pansgpt/types";
import { z } from "zod";
import { env } from "@/env";
import { applyChatEvent, finishChatMessage } from "@/lib/chat-message";
import { chatAttachmentSchema } from "@/lib/chat-history";
import { readerSnipOrigin } from "@/lib/reader-snips";
import { SSEEventStreamReader } from "@/lib/sse-parser";
import { createVoiceAdapter } from "./voice-adapter";
import {
  ChatFailure,
  publicFailure,
  failureFrom,
  responseFailure,
  fetchWithRecovery,
  retryDelay,
} from "@/lib/chat-recovery";
import { parseChatHistory } from "@/lib/chat-history";
import { parseRunSnapshot, recoveredMessage, trackChatTransport } from "@/lib/chat-run-recovery";
import { retrySafeTool } from "@/lib/chat-tool-policy";
import { contextAtParent } from "@/lib/message-context";

const toolArgsSchema = z.record(z.string(), z.json());
const acceptedFiles = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
]);

export function convertChatMessage(message: ChatMessageView): ThreadMessageLike {
  if (message.role === "user")
    return {
      id: message.id,
      role: "user",
      content: message.content,
      attachments: message.attachments?.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.content_type.startsWith("image/") ? "image" : "document",
        contentType: item.content_type,
        status: { type: "complete" as const },
        content: [],
      })),
    };
  const content: Exclude<ThreadMessageLike["content"], string>[number][] = [];
  for (const tool of message.tools ?? []) {
    content.push({
      type: "tool-call",
      toolCallId: tool.call_id,
      toolName: tool.tool_name,
      args: toolArgsSchema.safeParse(tool.arguments ?? {}).data ?? {},
      argsText: JSON.stringify(tool.arguments ?? {}),
      ...(tool.status === "running"
        ? {}
        : { result: tool.result ?? null, isError: tool.status === "error" }),
    });
  }
  if (message.content) content.push({ type: "text", text: message.content });
  return {
    id: message.id,
    role: "assistant",
    content,
    metadata: { submittedFeedback: message.feedback ? { type: message.feedback } : undefined },
    status:
      message.status === "running"
        ? { type: "running" }
        : message.status === "complete"
          ? { type: "complete", reason: "stop" }
          : {
              type: "incomplete",
              reason: message.status === "cancelled" ? "cancelled" : "error",
              error: message.error,
            },
  };
}

const sessionSchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid() });
const uuidSchema = z.string().uuid();
const base = `${env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat`;

type RunOptions = {
  editId?: string;
  regenerateId?: string;
  parentId?: string | null;
  retryMessageId?: string;
  actionMode?: ChatActionMode | null;
  documentId?: string | null;
  context?: ChatMessageContext;
  replace?: { questionId: string; answerId: string };
};
type RetryContext = {
  prompt: string;
  files: NonNullable<ChatMessageView["attachments"]>;
  options: RunOptions;
  questionId: string;
  answerId: string;
  canonical: boolean;
  ambiguous: boolean;
  blocked: boolean;
};

export function useChatRuntime({
  active: enabled = true,
  token,
  ownerId,
  canSend,
  initialSessionId,
  initialMessages,
  initialActionMode = null,
  onSessionChanged,
  onArtifactReady,
  fixedDocumentId = null,
}: {
  active?: boolean;
  token: string | undefined;
  ownerId: string;
  canSend: boolean;
  initialSessionId: string | null;
  initialMessages: ChatMessageView[];
  initialActionMode?: ChatActionMode | null;
  onSessionChanged: () => void;
  onArtifactReady?: (artifact: ArtifactItem) => void;
  fixedDocumentId?: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [headId, setHeadId] = useState<string | null>(
    () => initialMessages.filter((item) => item.isActive !== false).at(-1)?.id ?? null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [checkingRun, setCheckingRun] = useState(!!initialSessionId);
  const recoveringRun = useRef(false);
  const serverRunId = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [recording, setRecording] = useState<Blob | null>(null);
  const [canRetryVoice, setCanRetryVoice] = useState(false);
  const retryContexts = useRef(new Map<string, RetryContext>());
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [isSwitching, setIsSwitching] = useState(false);
  const [branchRevision, setBranchRevision] = useState(0);
  const pendingFeedback = useRef(new Set<string>());
  const [feedbackPending, setFeedbackPending] = useState<ReadonlySet<string>>(new Set());
  const [actionMode, setActionMode] = useState<ChatActionMode | null>(initialActionMode);
  const sessionId = useRef(initialSessionId);
  const actionModeRef = useRef<ChatActionMode | null>(initialActionMode);
  const selectedLibraryDocument = useRef<ChatLibrarySource | null | undefined>(undefined);
  const [explicitLibrarySource, setExplicitLibrarySource] = useState<
    ChatLibrarySource | null | undefined
  >(undefined);
  const editedContexts = useRef(new Map<string, ChatMessageContext>());
  const setEditedContext = useCallback((id: string, context: ChatMessageContext) => {
    editedContexts.current.set(id, context);
  }, []);
  const beginEditedContext = useCallback((id: string, context: ChatMessageContext) => {
    editedContexts.current.clear();
    editedContexts.current.set(id, context);
  }, []);
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const sessionPromise = useRef<Promise<string> | null>(null);
  const active = useRef<AbortController | null>(null);
  const readerFileUpload = useRef<AbortController | null>(null);
  const uploadingFiles = useRef(new Map<string, AbortController>());
  const uploadedFiles = useRef(
    new Map<
      string,
      { saved: NonNullable<ChatMessageView["attachments"]>[number]; session: string }
    >()
  );
  const draftAttachmentIds = useRef<() => string[]>(() => []);
  const lifetime = useRef<AbortController | null>(null);
  const available = useRef(enabled);
  const setSelectedLibrarySource = useCallback((document: ChatLibrarySource | null) => {
    selectedLibraryDocument.current = document;
    setExplicitLibrarySource(document);
  }, []);
  const setSelectedActionMode = useCallback((mode: ChatActionMode | null) => {
    actionModeRef.current = mode;
    setActionMode(mode);
  }, []);
  useEffect(() => {
    lifetime.current = new AbortController();
    return () => {
      lifetime.current?.abort();
      readerFileUpload.current?.abort();
      // An accepted response belongs to the account/conversation, not this view.
      // Its bounded transport may finish after navigation; auth and Stop own cancellation.
      available.current = false;
    };
  }, []);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const ensureSession = useCallback(
    async (signal?: AbortSignal): Promise<string> => {
      if (!token || !canSend)
        throw new Error("Please acknowledge the study notice before continuing.");
      if (sessionId.current) return sessionId.current;
      if (!sessionPromise.current) {
        sessionPromise.current = (async () => {
          const signals = [signal, ...(signal ? [] : [lifetime.current?.signal])].filter(
            (item): item is AbortSignal => !!item
          );
          const response = await fetch(`${base}/sessions`, {
            method: "POST",
            signal: AbortSignal.any([...signals, AbortSignal.timeout(60000)]),
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(fixedDocumentId ? { document_id: fixedDocumentId } : {}),
            } satisfies ChatSessionCreateRequest),
          });
          if (!response.ok) throw await responseFailure(response);
          const created = sessionSchema.parse(await response.json());
          if (created.user_id !== ownerId)
            throw new Error("The conversation does not belong to this account.");
          if (signal?.aborted || (!signal && lifetime.current?.signal.aborted))
            throw new DOMException("Cancelled", "AbortError");
          sessionId.current = created.id;
          setCurrentSessionId(created.id);
          onSessionChanged();
          return created.id;
        })().finally(() => {
          sessionPromise.current = null;
        });
      }
      return sessionPromise.current;
    },
    [token, canSend, headers, ownerId, onSessionChanged, fixedDocumentId]
  );

  const uploadFile = useCallback(
    async (file: File, signal?: AbortSignal) => {
      const id = await ensureSession(signal);
      const body = new FormData();
      body.append("file", file);
      const signals = [signal, lifetime.current?.signal].filter(
        (item): item is AbortSignal => !!item
      );
      const snip = fixedDocumentId ? readerSnipOrigin(file) : undefined;
      const response = await fetch(
        `${base}/sessions/${id}/${snip ? "document-snip" : "attachments"}`,
        {
          method: "POST",
          headers: snip ? { ...headers, "Content-Type": "application/json" } : headers,
          body: snip ? JSON.stringify(snip) : body,
          signal: AbortSignal.any([...signals, AbortSignal.timeout(60000)]),
        }
      );
      if (!response.ok) throw await responseFailure(response, "upload");
      const saved = chatAttachmentSchema.parse(await response.json());
      return saved;
    },
    [ensureSession, headers, fixedDocumentId]
  );

  const attachments = useMemo<AttachmentAdapter>(
    () => ({
      accept: ".pdf,.pptx,.docx,.txt,.md,.csv,image/png,image/jpeg",
      async *add({ file }) {
        const existing = new Set([
          ...draftAttachmentIds.current(),
          ...uploadingFiles.current.keys(),
          ...uploadedFiles.current.keys(),
        ]);
        if (existing.size >= 4) throw new Error("Attach up to four files at a time.");
        const origin = readerSnipOrigin(file);
        if (fixedDocumentId && origin && origin.document_id !== fixedDocumentId)
          throw new Error("Snip from the PDF open in this study chat.");
        if (!file.size || file.size > 10 * 1024 * 1024 || !acceptedFiles.has(file.type)) {
          const message = "Choose a PDF, PPTX, DOCX, text, PNG or JPEG file up to 10 MB.";
          throw new Error(message);
        }
        const draft = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type.startsWith("image/") ? ("image" as const) : ("document" as const),
          file,
          contentType: file.type,
        };
        const controller = new AbortController();
        uploadingFiles.current.set(draft.id, controller);
        yield {
          ...draft,
          status: { type: "running" as const, reason: "uploading" as const, progress: 0 },
        };
        try {
          const saved = await uploadFile(file, controller.signal);
          if (controller.signal.aborted || !sessionId.current) return;
          uploadedFiles.current.set(draft.id, { saved, session: sessionId.current });
          yield {
            ...draft,
            name: saved.name,
            contentType: saved.content_type,
            status: { type: "requires-action" as const, reason: "composer-send" as const },
          };
        } catch (failure) {
          if (controller.signal.aborted || lifetime.current?.signal.aborted) return;
          yield {
            ...draft,
            status: {
              type: "incomplete" as const,
              reason: "error" as const,
              message: failureFrom(failure, "upload").message,
            },
          };
        } finally {
          uploadingFiles.current.delete(draft.id);
        }
      },
      async send(attachment, options) {
        if (options?.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        const ready = uploadedFiles.current.get(attachment.id);
        if (!ready || ready.session !== sessionId.current)
          throw new Error("Wait for this file to finish uploading, or retry its upload.");
        const saved = ready.saved;
        return {
          id: saved.id,
          name: saved.name,
          type: saved.content_type.startsWith("image/") ? "image" : "document",
          contentType: saved.content_type,
          status: { type: "complete" },
          content: [],
        };
      },
      async remove(attachment) {
        uploadingFiles.current.get(attachment.id)?.abort();
        const ready = uploadedFiles.current.get(attachment.id);
        uploadedFiles.current.delete(attachment.id);
        // Message-bound files are retained; only this unsent draft's upload is removed.
        if (!ready) return;
        const response = await fetch(
          `${base}/sessions/${ready.session}/attachments/${ready.saved.id}`,
          {
            method: "DELETE",
            headers,
            signal: lifetime.current?.signal,
          }
        );
        if (!response.ok && response.status !== 404)
          throw await responseFailure(response, "upload");
      },
    }),
    [uploadFile, headers, fixedDocumentId]
  );

  const transcribeAudio = useCallback(
    async (audio: Blob, signal: AbortSignal): Promise<string> => {
      if (!token || !canSend)
        throw new Error("Please acknowledge the study notice before recording.");
      setRecording(audio);
      setCanRetryVoice(false);
      const body = new FormData();
      const extension = audio.type.includes("mp4")
        ? "m4a"
        : audio.type.includes("ogg")
          ? "ogg"
          : "webm";
      body.append("file", audio, `question.${extension}`);
      try {
        const response = await fetchWithRecovery(
          `${base}/transcribe`,
          {
            method: "POST",
            headers,
            body,
            signal,
          },
          { safeTranscription: true, timeoutMs: 30000 }
        );
        if (!response.ok) throw await responseFailure(response, "voice");
        const text = z.object({ text: z.string() }).parse(await response.json()).text;
        setRecording(null);
        return text;
      } catch (failure) {
        if (!signal.aborted) setCanRetryVoice(failureFrom(failure, "voice").retryable);
        else setRecording(null);
        throw failure;
      }
    },
    [token, canSend, headers]
  );
  const dictation = useMemo(() => createVoiceAdapter(transcribeAudio, setError), [transcribeAudio]);
  useEffect(() => () => dictation.dispose(), [dictation]);
  useEffect(() => {
    available.current = enabled;
    if (!enabled) {
      dictation.dispose();
    }
  }, [enabled, dictation]);

  useEffect(() => {
    for (const answer of initialMessages) {
      if (answer.role !== "assistant" || answer.status !== "error") continue;
      const question = initialMessages.find(
        (item) => item.id === answer.parentId && item.role === "user"
      );
      if (question)
        retryContexts.current.set(answer.id, {
          prompt: question.content,
          files: question.attachments || [],
          questionId: question.id,
          answerId: answer.id,
          canonical: true,
          ambiguous: false,
          blocked: answer.retryable === false,
          options: {
            documentId: fixedDocumentId ?? question.context?.library_document?.id,
            actionMode: question.context?.action_mode,
            context: question.context ?? undefined,
          },
        });
    }
  }, [initialMessages, fixedDocumentId]);

  useEffect(() => {
    if (!enabled || !token || !currentSessionId || active.current) {
      setCheckingRun(false);
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const next = (delay = 1500) => {
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), delay);
    };
    const history = async () => {
      const response = await fetchWithRecovery(
        `${base}/sessions/${currentSessionId}?include_branches=true`,
        { headers, signal: controller.signal, cache: "no-store" }
      );
      if (!response.ok) throw await responseFailure(response);
      return parseChatHistory(await response.json(), currentSessionId, ownerId);
    };
    const poll = async () => {
      let rescheduled = false;
      try {
        const response = await fetchWithRecovery(
          `${base}/sessions/${currentSessionId}/run`,
          { headers, signal: controller.signal, cache: "no-store" },
          { retries: 1, timeoutMs: 10000 }
        );
        if (controller.signal.aborted || active.current) return;
        // An older deployment/test adapter may not implement run snapshots.
        if (response.status === 404) return;
        if (response.status === 429) {
          // Snapshot reads may throttle independently of the accepted answer.
          // Respect the server's window without replaying inference or hammering it.
          failures++;
          if (failures <= 20) {
            rescheduled = true;
            setCheckingRun(true);
            next(Math.max(1000, retryDelay(failures, response.headers.get("Retry-After"))));
          } else setError("We couldn't check this response. Reopen the chat to try again.");
          return;
        }
        if (!response.ok) throw await responseFailure(response);
        const snapshot = parseRunSnapshot(await response.json());
        if (!snapshot || controller.signal.aborted || active.current) return;
        failures = 0;
        if (snapshot.run_id) serverRunId.current = snapshot.run_id;
        const wasRecovering = recoveringRun.current;
        recoveringRun.current = snapshot.status === "running";
        let saved: ChatMessageView[] | null = null;
        if (
          snapshot.user_message_id &&
          !messagesRef.current.some((item) => item.id === snapshot.user_message_id)
        )
          saved = await history();
        if (controller.signal.aborted || active.current) return;
        const message = recoveredMessage(snapshot);
        if (
          message &&
          !messagesRef.current.some(
            (item) => item.id === message.id && item.isSaved && item.status === "complete"
          )
        ) {
          const source = saved || messagesRef.current;
          if (source.some((item) => item.id === message.parentId)) {
            setMessages([
              ...source.filter(
                (item) =>
                  item.id !== message.id &&
                  !(
                    item.role === "assistant" &&
                    item.parentId === message.parentId &&
                    item.status !== "complete"
                  )
              ),
              message,
            ]);
            setHeadId(message.id);
            if (message.status === "error") {
              const question = source.find((item) => item.id === message.parentId);
              if (question)
                retryContexts.current.set(message.id, {
                  prompt: question.content,
                  files: question.attachments || [],
                  questionId: question.id,
                  answerId: message.id,
                  canonical: true,
                  ambiguous: false,
                  blocked: snapshot.retry_blocked ?? snapshot.tool_started,
                  options: {
                    documentId: fixedDocumentId ?? question.context?.library_document?.id,
                    actionMode: question.context?.action_mode,
                    context: question.context ?? undefined,
                  },
                });
            }
          }
        }
        if (snapshot.status === "running") {
          setIsRunning(true);
          next();
        } else {
          if (wasRecovering && !message) {
            const latest = await history();
            if (!controller.signal.aborted && !active.current) {
              setMessages(latest);
              setHeadId(latest.filter((item) => item.isActive !== false).at(-1)?.id ?? null);
            }
          }
          setIsRunning(false);
          if (wasRecovering) onSessionChanged();
        }
      } catch {
        if (!controller.signal.aborted && recoveringRun.current) {
          failures++;
          // Polling is a safe read; never repost the student's prompt after an
          // ambiguous disconnect. Keep the existing partial answer visible.
          if (failures <= 20) next(Math.min(8000, 1000 * 2 ** Math.min(failures, 3)));
          else {
            recoveringRun.current = false;
            setIsRunning(false);
            setError("Reconnect to check your response before sending again.");
          }
        }
      } finally {
        if (!controller.signal.aborted && !rescheduled) setCheckingRun(false);
      }
    };
    void poll();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [
    enabled,
    token,
    currentSessionId,
    ownerId,
    headers,
    isRunning,
    onSessionChanged,
    fixedDocumentId,
  ]);

  const run = useCallback(
    async (
      prompt: string,
      files: NonNullable<ChatMessageView["attachments"]>,
      options: RunOptions = {}
    ) => {
      // An attachment submission can finish after the Home sheet was closed.
      if (!available.current || lifetime.current?.signal.aborted) return;
      if (navigator.onLine === false) {
        setError(publicFailure("OFFLINE").message);
        return;
      }
      if (active.current || recoveringRun.current || checkingRun || isSwitching) return;
      if (!token || !canSend) {
        setError("Please acknowledge the study notice before sending.");
        return;
      }
      if (!prompt.trim() || prompt.length > 10000 || files.length > 4) {
        setError("Use a question up to 10,000 characters and at most four attachments.");
        return;
      }
      let submittedActionMode =
        options.actionMode !== undefined
          ? options.actionMode
          : options.editId || options.regenerateId
            ? null
            : actionModeRef.current;
      const inheritedSource = contextAtParent(
        messages,
        options.parentId === undefined ? headId : options.parentId
      )?.library_document;
      const selectedSource =
        options.context?.library_document ??
        (selectedLibraryDocument.current === undefined
          ? inheritedSource
          : selectedLibraryDocument.current);
      let submittedDocument =
        options.documentId !== undefined
          ? options.documentId
          : (fixedDocumentId ?? selectedSource?.id ?? null);
      let submittedContext: ChatMessageContext = {
        action_mode: submittedActionMode,
        library_document: submittedDocument
          ? (options.context?.library_document ??
            selectedSource ?? { id: submittedDocument, title: "Library document" })
          : null,
      };
      const controller = new AbortController();
      active.current = controller;
      serverRunId.current = null;
      const untrack = trackChatTransport(ownerId, () => {
        const id = sessionId.current,
          runId = serverRunId.current;
        if (id && runId)
          void fetch(`${base}/sessions/${id}/runs/${runId}/cancel`, {
            method: "POST",
            headers,
            keepalive: true,
          }).catch(() => undefined);
        controller.abort();
      });
      const current = () => active.current === controller && !controller.signal.aborted;
      const original = options.regenerateId
        ? messages.find((item) => item.id === options.regenerateId)
        : undefined;
      let questionId = options.replace?.questionId ?? original?.parentId ?? crypto.randomUUID();
      const placeholderId = options.replace?.answerId ?? crypto.randomUUID();
      let answer: ChatMessageView = {
        id: placeholderId,
        parentId: questionId,
        role: "assistant",
        content: "",
        status: "running",
      };
      let canonical = false;
      let requestStarted = false;
      let rejected = false;
      let terminal = false;
      let blocked = false;
      const publish = () =>
        setMessages((previous) =>
          previous.map((item) =>
            item.id === placeholderId || item.id === answer.id ? answer : item
          )
        );
      let parentId = options.parentId === undefined ? headId : options.parentId;
      // Failed/cancelled optimistic turns may never have been stored. A new
      // question must resume from a saved assistant, not a browser-only ID.
      while (parentId) {
        const parent = messages.find((item) => item.id === parentId);
        if (!parent || (parent.isSaved && parent.role === "assistant")) break;
        parentId = parent.parentId ?? null;
      }
      setMessages((previous) => [
        ...previous.filter((item) => item.id !== options.replace?.answerId),
        ...(options.regenerateId || options.replace
          ? []
          : [
              {
                id: questionId,
                parentId,
                role: "user" as const,
                content: prompt,
                status: "complete" as const,
                attachments: files,
                context: submittedContext,
              },
            ]),
        answer,
      ]);
      setHeadId(answer.id);
      setError(null);
      setRecording(null);
      setCanRetryVoice(false);
      setIsRunning(true);
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let slowTimer: ReturnType<typeof setTimeout> | undefined;
      const scheduleSlow = () => {
        if (slowTimer) clearTimeout(slowTimer);
        slowTimer = setTimeout(() => {
          if (current() && answer.status === "running") {
            answer = { ...answer, recovery: "slow" };
            publish();
          }
        }, 12000);
      };
      scheduleSlow();
      const delayTimer = setTimeout(() => {
        if (current() && answer.status === "running") {
          answer = { ...answer, delayed: true };
          publish();
        }
      }, 30000);
      try {
        const id = await ensureSession(controller.signal);
        if (!current()) return;
        const payload: ChatStreamRequest = {
          message: prompt,
          action_mode: submittedActionMode,
          parent_message_id: parentId,
          document_id: submittedDocument,
          edit_message_id: options.editId,
          regenerate_message_id: options.regenerateId,
          retry_message_id: options.retryMessageId,
          attachment_ids: files.map((item) => item.id),
          enable_rag: true,
          enable_tools: true,
        };
        requestStarted = true;
        const response = await fetch(`${base}/sessions/${id}/stream`, {
          method: "POST",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(150000)]),
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!current()) return;
        if (!response.ok) {
          rejected = true;
          throw await responseFailure(response);
        }
        const returnedRunId = response.headers.get("x-chat-run-id");
        if (uuidSchema.safeParse(returnedRunId).success) serverRunId.current = returnedRunId;
        if (!response.body) throw new Error("The chat service returned no response stream.");
        if (submittedActionMode !== null) setSelectedActionMode(null);
        if (!options.editId && !options.regenerateId && !options.retryMessageId) {
          selectedLibraryDocument.current = undefined;
          setExplicitLibrarySource(undefined);
        }
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new SSEEventStreamReader();
        while (current()) {
          const chunk = await reader.read();
          if (!current()) return;
          const events = chunk.done
            ? [...parser.push(decoder.decode()), ...parser.flush()]
            : parser.push(decoder.decode(chunk.value, { stream: true }));
          for (const event of events) {
            if (event.event === "init" && uuidSchema.safeParse(event.data.run_id).success)
              serverRunId.current = event.data.run_id!;
            if (
              [
                "text_chunk",
                "public_progress",
                "tool_start",
                "tool_end",
                "artifact_ready",
                "citations",
                "init",
                "activity",
              ].includes(event.event)
            )
              scheduleSlow();
            if (event.event === "error" || event.event === "done") terminal = true;
            if (
              event.event === "artifact_ready" ||
              (event.event === "tool_start" && !retrySafeTool(event.data.tool_name))
            )
              blocked = true;
            if (event.event === "init" && event.data.session_id && event.data.session_id !== id)
              throw new Error("The response belongs to a different conversation.");
            if (
              event.event === "init" &&
              uuidSchema.safeParse(event.data.user_message_id).success &&
              uuidSchema.safeParse(event.data.assistant_message_id).success
            ) {
              const oldQuestionId = questionId;
              if (event.data.context) {
                submittedContext = event.data.context;
                submittedActionMode = submittedContext.action_mode;
                submittedDocument = submittedContext.library_document?.id ?? null;
              }
              questionId = event.data.user_message_id!;
              answer = { ...answer, id: event.data.assistant_message_id!, parentId: questionId };
              canonical = true;
              window.dispatchEvent(new Event("pansgpt-credits-changed"));
              setMessages((previous) =>
                previous.map((item) =>
                  item.id === oldQuestionId
                    ? { ...item, id: questionId, context: submittedContext }
                    : item
                )
              );
              setHeadId(answer.id);
            }
            answer = applyChatEvent(answer, event);
            if (event.event === "artifact_ready" && available.current)
              onArtifactReady?.(event.data);
          }
          publish();
          if (chunk.done || events.some((event) => event.event === "done")) break;
        }
      } catch (failure: unknown) {
        if (current())
          answer = {
            ...answer,
            status: "error",
            error: failureFrom(failure).message,
            failure: failureFrom(failure),
            retryable: failureFrom(failure).retryable,
            recovery: undefined,
          };
      } finally {
        untrack();
        if (slowTimer) clearTimeout(slowTimer);
        clearTimeout(delayTimer);
        if (reader) {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        if (active.current === controller) {
          answer = {
            ...finishChatMessage(answer, controller.signal.aborted),
            isSaved: canonical && answer.status === "complete",
            ...(blocked && answer.status === "error"
              ? {
                  retryable: false,
                  error: publicFailure("TOOL_RETRY_BLOCKED").message,
                  failure: {
                    ...publicFailure("TOOL_RETRY_BLOCKED"),
                    reference: answer.failure?.reference,
                  },
                }
              : {}),
          };
          if (answer.status === "error")
            retryContexts.current.set(answer.id, {
              prompt,
              files,
              questionId,
              answerId: answer.id,
              canonical,
              ambiguous: requestStarted && !terminal && !rejected,
              blocked,
              options: {
                ...options,
                documentId: submittedDocument,
                actionMode: submittedActionMode,
                context: submittedContext,
                parentId,
              },
            });
          else retryContexts.current.delete(answer.id);
          publish();
          if (answer.isSaved)
            setMessages((previous) =>
              previous.map((item) => (item.id === questionId ? { ...item, isSaved: true } : item))
            );
          // Response failures render with their message; composer errors have separate state.
          setIsRunning(false);
          active.current = null;
          window.dispatchEvent(new Event("pansgpt-credits-changed"));
          onSessionChanged();
        }
      }
    },
    [
      token,
      canSend,
      isSwitching,
      messages,
      headId,
      ensureSession,
      headers,
      onSessionChanged,
      onArtifactReady,
      setSelectedActionMode,
      fixedDocumentId,
      checkingRun,
      ownerId,
    ]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      const context = retryContexts.current.get(messageId);
      if (!context || active.current || !available.current) return;
      if (!online) {
        setError(publicFailure("OFFLINE").message);
        return;
      }
      if (context.blocked) {
        setError(publicFailure("TOOL_RETRY_BLOCKED").message);
        return;
      }
      try {
        const id = sessionId.current;
        if (!id) {
          if (context.ambiguous) throw new ChatFailure(publicFailure("409"));
          await run(context.prompt, context.files, {
            ...context.options,
            replace: { questionId: context.questionId, answerId: context.answerId },
          });
          return;
        }
        const response = await fetchWithRecovery(`${base}/sessions/${id}?include_branches=true`, {
          headers,
          signal: lifetime.current?.signal,
          cache: "no-store",
        });
        if (!response.ok) throw await responseFailure(response);
        const saved = parseChatHistory(await response.json(), id, ownerId);
        const completed = saved.find(
          (item) =>
            item.id === context.answerId && item.role === "assistant" && item.status === "complete"
        );
        if (completed) {
          setMessages((previous) =>
            previous.map((item) =>
              item.id === messageId
                ? completed
                : item.id === context.questionId
                  ? { ...item, isSaved: true }
                  : item
            )
          );
          setHeadId(completed.id);
          setError(null);
          retryContexts.current.delete(messageId);
          onSessionChanged();
          return;
        }
        if (context.ambiguous && !context.canonical) throw new ChatFailure(publicFailure("409"));
        const existingQuestion = saved.find(
          (item) => item.id === context.questionId && item.role === "user"
        );
        await run(context.prompt, context.files, {
          ...context.options,
          ...(existingQuestion
            ? { retryMessageId: existingQuestion.id, editId: undefined, regenerateId: undefined }
            : {}),
          replace: { questionId: context.questionId, answerId: context.answerId },
        });
      } catch (failure) {
        if (!lifetime.current?.signal.aborted) {
          const view = failureFrom(failure);
          setMessages((previous) =>
            previous.map((item) =>
              item.id === messageId
                ? { ...item, error: view.message, failure: view, retryable: view.retryable }
                : item
            )
          );
        }
      }
    },
    [run, online, headers, ownerId, onSessionChanged]
  );

  const onNew = useCallback(
    async (append: AppendMessage) => {
      const text = append.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("\n")
        .trim();
      const files = (append.attachments ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        content_type: item.contentType ?? "application/octet-stream",
        size:
          [...uploadedFiles.current.values()].find((value) => value.saved.id === item.id)?.saved
            .size ??
          messages
            .flatMap((message) => message.attachments ?? [])
            .find((file) => file.id === item.id)?.size ??
          item.file?.size ??
          1,
      }));
      if (append.content.some((part) => part.type !== "text")) {
        setError("Use the attachment button to send files.");
        return;
      }
      await run(text || (files.length ? "Explain the attached study material." : ""), files, {
        parentId: append.parentId,
        editId: append.sourceId ?? undefined,
        ...(append.sourceId
          ? (() => {
              const context =
                editedContexts.current.get(append.sourceId) ??
                messages.find((item) => item.id === append.sourceId)?.context;
              return context
                ? {
                    context,
                    actionMode: context.action_mode,
                    documentId: context.library_document?.id ?? null,
                  }
                : {};
            })()
          : {}),
      });
      if (append.sourceId) editedContexts.current.delete(append.sourceId);
      for (const [key, ready] of uploadedFiles.current)
        if (files.some((file) => file.id === ready.saved.id)) uploadedFiles.current.delete(key);
    },
    [run, messages]
  );
  const onReload = useCallback(
    async (parentId: string | null) => {
      const target = messages
        .filter((item) => item.parentId === parentId && item.role === "assistant" && item.isSaved)
        .at(-1);
      const question = messages.find((item) => item.id === parentId && item.role === "user");
      if (!target || !question) {
        setError("Reopen this conversation before retrying the answer.");
        return;
      }
      await run(question.content, question.attachments ?? [], {
        regenerateId: target.id,
        parentId: question.parentId,
        actionMode: question.context?.action_mode,
        documentId: fixedDocumentId ?? question.context?.library_document?.id,
        context: question.context ?? undefined,
      });
    },
    [messages, run, fixedDocumentId]
  );

  const persistBranch = useCallback(
    (selected: readonly ChatMessageView[]) => {
      const selectedHead = selected.at(-1)?.id;
      if (!selectedHead || !sessionId.current || active.current || isSwitching) return;
      setIsSwitching(true);
      void fetch(`${base}/sessions/${sessionId.current}/branch`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: selectedHead } satisfies ChatBranchRequest),
        signal: lifetime.current?.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw await responseFailure(response, "mutation");
          if (!lifetime.current?.signal.aborted) {
            setHeadId(selectedHead);
            setError(null);
          }
        })
        .catch((failure: unknown) => {
          if (!lifetime.current?.signal.aborted) {
            setError(failureFrom(failure, "mutation").message);
            setBranchRevision((value) => value + 1);
          }
        })
        .finally(() => {
          if (!lifetime.current?.signal.aborted) setIsSwitching(false);
        });
    },
    [headers, isSwitching]
  );
  const messageRepository = useMemo(() => {
    void branchRevision;
    const repository = ExportedMessageRepository.fromBranchableArray(
      messages.map((message) => ({
        message: convertChatMessage(message),
        parentId: message.parentId ?? null,
      })),
      { headId }
    );
    repository.messages.forEach((item, index) =>
      bindExternalStoreMessage(item.message, messages[index]!)
    );
    return repository;
    // A rejected branch mutation must restore the server-confirmed selection.
  }, [messages, headId, branchRevision]);
  const submitFeedback = useCallback(
    async (messageId: string, rating: "positive" | "negative", comment?: string): Promise<void> => {
      if (!sessionId.current || !token) throw new Error("Reopen this chat before rating it.");
      if (pendingFeedback.current.has(messageId)) return;
      pendingFeedback.current.add(messageId);
      setFeedbackPending(new Set(pendingFeedback.current));
      try {
        const response = await fetch(
          `${base}/sessions/${sessionId.current}/messages/${messageId}/feedback`,
          {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ rating, comment } satisfies ChatFeedbackRequest),
            signal: lifetime.current?.signal,
          }
        );
        if (!response.ok) throw await responseFailure(response, "mutation");
        if (!lifetime.current?.signal.aborted) {
          setMessages((previous) =>
            previous.map((item) => (item.id === messageId ? { ...item, feedback: rating } : item))
          );
          setError(null);
        }
      } catch (failure: unknown) {
        if (!lifetime.current?.signal.aborted) setError(failureFrom(failure, "mutation").message);
        throw failure;
      } finally {
        pendingFeedback.current.delete(messageId);
        if (!lifetime.current?.signal.aborted) setFeedbackPending(new Set(pendingFeedback.current));
      }
    },
    [headers, token]
  );
  const runtime = useExternalStoreRuntime<ChatMessageView>({
    messages,
    messageRepository,
    convertMessage: convertChatMessage,
    isRunning,
    isLoading: isSwitching,
    isSendDisabled: !enabled || !token || !canSend || isSwitching || checkingRun || !online,
    onNew,
    onEdit: onNew,
    onReload,
    onCancel: async () => {
      try {
        const id = sessionId.current;
        if (id) {
          let runId = serverRunId.current;
          if (!runId) {
            const response = await fetchWithRecovery(`${base}/sessions/${id}/run`, {
              headers,
              cache: "no-store",
            });
            if (response.ok) runId = parseRunSnapshot(await response.json())?.run_id ?? null;
          }
          if (runId) {
            const response = await fetch(`${base}/sessions/${id}/runs/${runId}/cancel`, {
              method: "POST",
              headers,
            });
            if (!response.ok) throw await responseFailure(response);
          }
        }
        active.current?.abort();
        readerFileUpload.current?.abort();
      } catch (failure) {
        setError(failureFrom(failure).message);
      }
    },
    setMessages: persistBranch,
    adapters: {
      attachments: canSend && token ? attachments : undefined,
      dictation: canSend && token ? dictation : undefined,
      feedback: {
        submit({ message, type, comment }) {
          void submitFeedback(message.id, type, comment).catch(() => undefined);
        },
      },
    },
  });
  useEffect(() => {
    draftAttachmentIds.current = () =>
      runtime.thread.composer.getState().attachments.map((item) => item.id);
    return () => {
      draftAttachmentIds.current = () => [];
    };
  }, [runtime]);
  const sendReaderFile = useCallback(
    async (text: string, file: File): Promise<void> => {
      if (readerFileUpload.current || active.current || !available.current) return;
      if (!navigator.onLine) {
        setError(publicFailure("OFFLINE").message);
        return;
      }
      const controller = new AbortController();
      readerFileUpload.current = controller;
      setIsRunning(true);
      try {
        const saved = await uploadFile(file, controller.signal);
        if (controller.signal.aborted) return;
        await run(text, [saved]);
      } catch (failure) {
        if (!lifetime.current?.signal.aborted && !controller.signal.aborted) {
          setError(failureFrom(failure, "upload").message);
          if (!runtime.thread.composer.getState().text.trim())
            runtime.thread.composer.setText(text);
          // Keep the image available for a deliberate Send after an upload failure.
          if (runtime.thread.composer.getState().attachments.length < 4)
            await runtime.thread.composer.addAttachment(file).catch(() => undefined);
        }
      } finally {
        readerFileUpload.current = null;
        if (!lifetime.current?.signal.aborted) setIsRunning(false);
      }
    },
    [uploadFile, run, runtime]
  );
  const retryVoice = useCallback(async () => {
    const audio = recording;
    if (!audio || !available.current || !lifetime.current || active.current) return;
    setCanRetryVoice(false);
    try {
      const text = await transcribeAudio(audio, lifetime.current.signal);
      if (lifetime.current.signal.aborted || !available.current) return;
      const previous = runtime.thread.composer.getState().text;
      runtime.thread.composer.setText(previous.trim() ? `${previous}\n${text}` : text);
      setError(null);
    } catch (failure) {
      if (!lifetime.current?.signal.aborted) setError(failureFrom(failure, "voice").message);
    }
  }, [transcribeAudio, runtime, recording]);
  return {
    runtime,
    isRunning,
    online,
    retryMessage,
    sendReaderFile,
    retryVoice,
    canRetryVoice,
    error,
    feedbackPending,
    currentSessionId,
    setSelectedLibrarySource,
    // History remains available to follow-up questions, but only an unsent
    // selection belongs in the composer. Accepted sends consume that selection.
    librarySource: explicitLibrarySource ?? null,
    setEditedContext,
    beginEditedContext,
    actionMode,
    setSelectedActionMode,
  };
}
