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
} from "@/lib/chat-recovery";
import { parseChatHistory } from "@/lib/chat-history";

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
  const selectedLibraryDocumentId = useRef<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const sessionPromise = useRef<Promise<string> | null>(null);
  const active = useRef<AbortController | null>(null);
  const readerFileUpload = useRef<AbortController | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const available = useRef(enabled);
  const setSelectedLibraryDocumentId = useCallback((documentId: string | null) => {
    selectedLibraryDocumentId.current = documentId;
  }, []);
  const setSelectedActionMode = useCallback((mode: ChatActionMode | null) => {
    actionModeRef.current = mode;
    setActionMode(mode);
  }, []);
  useEffect(() => {
    lifetime.current = new AbortController();
    return () => {
      lifetime.current?.abort();
      active.current?.abort();
      readerFileUpload.current?.abort();
      active.current = null;
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
          const signals = [signal, lifetime.current?.signal].filter(
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
          if (signal?.aborted || lifetime.current?.signal.aborted)
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
      async add({ file }) {
        const origin = readerSnipOrigin(file);
        if (fixedDocumentId && origin && origin.document_id !== fixedDocumentId)
          throw new Error("Snip from the PDF open in this study chat.");
        if (!file.size || file.size > 10 * 1024 * 1024 || !acceptedFiles.has(file.type)) {
          const message = "Choose a PDF, PPTX, DOCX, text, PNG or JPEG file up to 10 MB.";
          throw new Error(message);
        }
        return {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "document",
          file,
          contentType: file.type,
          status: { type: "requires-action", reason: "composer-send" },
        };
      },
      async send(attachment, options) {
        const saved = await uploadFile(attachment.file, options?.signal);
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
        // Pending files have never left this browser. Bound message files are retained with history.
        if (attachment.status.type !== "complete" || !sessionId.current) return;
        const response = await fetch(
          `${base}/sessions/${sessionId.current}/attachments/${attachment.id}`,
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
      active.current?.abort();
      readerFileUpload.current?.abort();
      dictation.dispose();
    }
  }, [enabled, dictation]);

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
      if (active.current || isSwitching) return;
      if (!token || !canSend) {
        setError("Please acknowledge the study notice before sending.");
        return;
      }
      if (!prompt.trim() || prompt.length > 10000 || files.length > 4) {
        setError("Use a question up to 10,000 characters and at most four attachments.");
        return;
      }
      const submittedActionMode =
        options.actionMode !== undefined
          ? options.actionMode
          : options.editId || options.regenerateId
            ? null
            : actionModeRef.current;
      const submittedDocument =
        options.documentId !== undefined
          ? options.documentId
          : (fixedDocumentId ?? selectedLibraryDocumentId.current);
      const controller = new AbortController();
      active.current = controller;
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
      try {
        const id = await ensureSession(controller.signal);
        if (!current()) return;
        const payload: ChatStreamRequest = {
          message: prompt,
          action_mode: submittedActionMode ?? undefined,
          parent_message_id: parentId,
          document_id: submittedDocument ?? undefined,
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
        if (!response.body) throw new Error("The chat service returned no response stream.");
        if (submittedActionMode !== null) setSelectedActionMode(null);
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
            if (
              ["text_chunk", "public_progress", "tool_start", "tool_end", "recovery"].includes(
                event.event
              )
            )
              scheduleSlow();
            if (event.event === "error" || event.event === "done") terminal = true;
            if (event.event === "tool_start" || event.event === "artifact_ready") blocked = true;
            if (event.event === "init" && event.data.session_id && event.data.session_id !== id)
              throw new Error("The response belongs to a different conversation.");
            if (
              event.event === "init" &&
              uuidSchema.safeParse(event.data.user_message_id).success &&
              uuidSchema.safeParse(event.data.assistant_message_id).success
            ) {
              const oldQuestionId = questionId;
              questionId = event.data.user_message_id!;
              answer = { ...answer, id: event.data.assistant_message_id!, parentId: questionId };
              canonical = true;
              window.dispatchEvent(new Event("pansgpt-credits-changed"));
              setMessages((previous) =>
                previous.map((item) =>
                  item.id === oldQuestionId ? { ...item, id: questionId } : item
                )
              );
              setHeadId(answer.id);
            }
            answer = applyChatEvent(answer, event);
            if (event.event === "artifact_ready") onArtifactReady?.(event.data);
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
        if (slowTimer) clearTimeout(slowTimer);
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
                  error:
                    "Something went wrong. Check any generated results before starting a new request.",
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
        setError("Check the study-tool results before making a new request.");
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
          (item) => item.id === context.answerId && item.role === "assistant"
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
        size: item.file?.size || 1,
      }));
      if (append.content.some((part) => part.type !== "text")) {
        setError("Use the attachment button to send files.");
        return;
      }
      await run(text || (files.length ? "Explain the attached study material." : ""), files, {
        parentId: append.parentId,
        editId: append.sourceId ?? undefined,
      });
    },
    [run]
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
      });
    },
    [messages, run]
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
    isSendDisabled: !enabled || !token || !canSend || isSwitching || !online,
    onNew,
    onEdit: onNew,
    onReload,
    onCancel: async () => {
      active.current?.abort();
      readerFileUpload.current?.abort();
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
    setSelectedLibraryDocumentId,
    actionMode,
    setSelectedActionMode,
  };
}
