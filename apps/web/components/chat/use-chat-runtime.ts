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
import { SSEEventStreamReader } from "@/lib/sse-parser";
import { createVoiceAdapter } from "./voice-adapter";

const toolArgsSchema = z.record(z.string(), z.json());

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
  if (message.thinking || message.tools?.length)
    content.push({ type: "reasoning", text: message.thinking || "Running a study tool." });
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

async function apiError(response: Response): Promise<string> {
  const parsed: unknown = await response.json().catch(() => null);
  const detail = z.object({ detail: z.string() }).safeParse(parsed);
  return detail.success
    ? detail.data.detail
    : `The chat service returned HTTP ${response.status}. Please retry.`;
}

type RunOptions = { editId?: string; regenerateId?: string; parentId?: string | null };

export function useChatRuntime({
  active: enabled = true,
  token,
  ownerId,
  canSend,
  initialSessionId,
  initialMessages,
  onSessionChanged,
  onArtifactReady,
}: {
  active?: boolean;
  token: string | undefined;
  ownerId: string;
  canSend: boolean;
  initialSessionId: string | null;
  initialMessages: ChatMessageView[];
  onSessionChanged: () => void;
  onArtifactReady?: (artifact: ArtifactItem) => void;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [headId, setHeadId] = useState<string | null>(
    () => initialMessages.filter((item) => item.isActive !== false).at(-1)?.id ?? null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [branchRevision, setBranchRevision] = useState(0);
  const sessionId = useRef(initialSessionId);
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const sessionPromise = useRef<Promise<string> | null>(null);
  const active = useRef<AbortController | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const available = useRef(enabled);
  useEffect(() => {
    lifetime.current = new AbortController();
    return () => {
      lifetime.current?.abort();
      active.current?.abort();
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
            signal: signals.length ? AbortSignal.any(signals) : undefined,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({} satisfies ChatSessionCreateRequest),
          });
          if (!response.ok) throw new Error(await apiError(response));
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
    [token, canSend, headers, ownerId, onSessionChanged]
  );

  const attachments = useMemo<AttachmentAdapter>(
    () => ({
      accept: "application/pdf,text/plain,text/markdown,text/csv,image/png,image/jpeg",
      async add({ file }) {
        if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Use a file up to 10 MB.");
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
        const id = await ensureSession(options?.signal);
        const body = new FormData();
        body.append("file", attachment.file);
        const signals = [options?.signal, lifetime.current?.signal].filter(
          (item): item is AbortSignal => !!item
        );
        const response = await fetch(`${base}/sessions/${id}/attachments`, {
          method: "POST",
          headers,
          body,
          signal: signals.length ? AbortSignal.any(signals) : undefined,
        });
        if (!response.ok) throw new Error(await apiError(response));
        const saved = chatAttachmentSchema.parse(await response.json());
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
        if (!response.ok && response.status !== 404) throw new Error(await apiError(response));
      },
    }),
    [ensureSession, headers]
  );

  const dictation = useMemo(
    () =>
      createVoiceAdapter(async (audio, signal) => {
        if (!token || !canSend)
          throw new Error("Please acknowledge the study notice before recording.");
        const body = new FormData();
        const extension = audio.type.includes("mp4")
          ? "m4a"
          : audio.type.includes("ogg")
            ? "ogg"
            : "webm";
        body.append("file", audio, `question.${extension}`);
        const response = await fetch(`${base}/transcribe`, {
          method: "POST",
          headers,
          body,
          signal,
        });
        if (!response.ok) throw new Error(await apiError(response));
        return z.object({ text: z.string() }).parse(await response.json()).text;
      }, setError),
    [token, canSend, headers]
  );
  useEffect(() => () => dictation.dispose(), [dictation]);
  useEffect(() => {
    available.current = enabled;
    if (!enabled) {
      active.current?.abort();
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
      if (active.current || isSwitching) return;
      if (!token || !canSend) {
        setError("Please acknowledge the study notice before sending.");
        return;
      }
      if (!prompt.trim() || prompt.length > 10000 || files.length > 4) {
        setError("Use a question up to 10,000 characters and at most four attachments.");
        return;
      }
      const controller = new AbortController();
      active.current = controller;
      const current = () => active.current === controller && !controller.signal.aborted;
      const original = options.regenerateId
        ? messages.find((item) => item.id === options.regenerateId)
        : undefined;
      let questionId = original?.parentId ?? crypto.randomUUID();
      const placeholderId = crypto.randomUUID();
      let answer: ChatMessageView = {
        id: placeholderId,
        parentId: questionId,
        role: "assistant",
        content: "",
        status: "running",
      };
      let canonical = false;
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
        ...previous,
        ...(options.regenerateId
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
      setIsRunning(true);
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        const id = await ensureSession(controller.signal);
        if (!current()) return;
        const payload: ChatStreamRequest = {
          message: prompt,
          parent_message_id: parentId,
          edit_message_id: options.editId,
          regenerate_message_id: options.regenerateId,
          attachment_ids: files.map((item) => item.id),
          enable_rag: true,
          enable_tools: true,
        };
        const response = await fetch(`${base}/sessions/${id}/stream`, {
          method: "POST",
          signal: controller.signal,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!current()) return;
        if (!response.ok) throw new Error(await apiError(response));
        if (!response.body) throw new Error("The chat service returned no response stream.");
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
          if (chunk.done) break;
        }
      } catch (failure: unknown) {
        if (current())
          answer = {
            ...answer,
            status: "error",
            error:
              failure instanceof Error ? failure.message : "The response failed. Please retry.",
          };
      } finally {
        if (reader) {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        if (active.current === controller) {
          answer = {
            ...finishChatMessage(answer, controller.signal.aborted),
            isSaved: canonical && answer.status === "complete",
          };
          publish();
          if (answer.isSaved)
            setMessages((previous) =>
              previous.map((item) => (item.id === questionId ? { ...item, isSaved: true } : item))
            );
          // Response failures render with their message; composer errors have separate state.
          setIsRunning(false);
          active.current = null;
          if (answer.status === "complete") onSessionChanged();
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
    ]
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
          if (!response.ok) throw new Error(await apiError(response));
          if (!lifetime.current?.signal.aborted) {
            setHeadId(selectedHead);
            setError(null);
          }
        })
        .catch((failure: unknown) => {
          if (!lifetime.current?.signal.aborted) {
            setError(failure instanceof Error ? failure.message : "Branch selection failed.");
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
        if (!response.ok) throw new Error(await apiError(response));
        if (!lifetime.current?.signal.aborted) {
          setMessages((previous) =>
            previous.map((item) => (item.id === messageId ? { ...item, feedback: rating } : item))
          );
          setError(null);
        }
      } catch (failure: unknown) {
        if (!lifetime.current?.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Feedback was not saved. Please retry."
          );
        throw failure;
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
    isSendDisabled: !enabled || !token || !canSend || isSwitching,
    onNew,
    onEdit: onNew,
    onReload,
    onCancel: async () => {
      active.current?.abort();
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
  return { runtime, isRunning, error, submitFeedback, currentSessionId };
}
