"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  MessagePrimitive,
  getExternalStoreMessages,
  useAuiState,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  MarkdownTextPrimitive,
  type MarkdownTextPrimitiveProps,
  type CodeHeaderProps,
} from "@assistant-ui/react-markdown";
import type { ChatMessageView } from "@pansgpt/types";
import { Tooltip } from "@pansgpt/ui/shell";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Copy,
  AlertCircle,
  Check,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { ArtifactRenderer } from "@/components/artifacts/ArtifactRenderer";
import { externalSourceUrl } from "@/lib/sse-parser";
import { documentSources, safeChatLink } from "@/lib/chat-message";
import { useChatActions } from "./actions-context";
import "katex/dist/katex.min.css";
import { ChatReasoning } from "./reasoning";
import { ThinkingStatus, StreamRevealProvider, StreamingWord } from "./motion";
import { rehypeStreamWords } from "@/lib/rehype-stream-words";
import { ChatAttachment } from "./attachment";

function useOriginalMessage(): ChatMessageView | undefined {
  return useAuiState((state) => getExternalStoreMessages<ChatMessageView>(state.message)[0]);
}

function CodeHeader({ language, code }: CodeHeaderProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return (
    <div className="study-chat-code-header">
      <span>{language || "Code"}</span>
      <button
        type="button"
        aria-label="Copy code"
        onClick={() => {
          if (!navigator.clipboard?.writeText) {
            setFailed(true);
            return;
          }
          void navigator.clipboard
            .writeText(code)
            .then(() => {
              setCopied(true);
              setFailed(false);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => setFailed(true));
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
      {failed && <span role="status">Select the code and copy it manually.</span>}
    </div>
  );
}

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex, rehypeStreamWords];
const markdownComponents: NonNullable<MarkdownTextPrimitiveProps["components"]> = {
  CodeHeader,
  span: ({ node, children, ...props }) => {
    const offset = node?.properties["data-stream-offset"];
    return typeof offset === "number" ? (
      <StreamingWord offset={offset}>{children}</StreamingWord>
    ) : (
      <span {...props}>{children}</span>
    );
  },
  a: ({ href, children }) => {
    const safe = safeChatLink(href);
    return safe ? (
      <a href={safe} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  },
  img: ({ alt }) => (
    <span className="study-chat-image-placeholder">
      {alt || "Image"} (image preview unavailable)
    </span>
  ),
};

function ChatMarkdown(): React.ReactElement {
  const streaming = useAuiState((state) => state.message.status?.type === "running");
  const message = useOriginalMessage();
  // Capture origin on mount: a fresh single-batch answer is already complete,
  // whereas database history has no receipt time and must never replay.
  const [animateArrival] = useState(
    () => message?.receivedAt !== undefined && (streaming || Date.now() - message.receivedAt < 1000)
  );
  return (
    <StreamRevealProvider animate={animateArrival}>
      <MarkdownTextPrimitive
        className="study-chat-markdown"
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
        smooth={false}
      />
    </StreamRevealProvider>
  );
}

// Tool execution stays in the runtime; public status lives in the Steps panel.
const ChatTool: ToolCallMessagePartComponent = () => null;

function MessageExtras(): React.ReactElement | null {
  const message = useOriginalMessage();
  if (!message) return null;
  return (
    <>
      {message.artifacts?.map((artifact, index) => (
        <div className="study-chat-artifact" key={`${artifact.skill_name}:${index}`}>
          <ArtifactRenderer artifact={artifact} />
        </div>
      ))}
      {!!message.citations?.length && (
        <div className="study-chat-sources">
          <span>
            <BookOpen size={13} aria-hidden="true" />
            Sources
          </span>
          <div>
            {documentSources(message.citations).map((citation, index) => {
              const url = externalSourceUrl(citation);
              return url ? (
                <a
                  key={index}
                  href={url}
                  title={citation.snippet}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {citation.title} — Web source
                </a>
              ) : (
                <span key={index} title={citation.snippet}>
                  {citation.title}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function CopyAction(): React.ReactElement {
  const copied = useAuiState((state) => state.message.isCopied);
  const message = useOriginalMessage();
  const busy = useAuiState((state) => state.thread.isRunning || state.thread.isLoading);
  const { submitFeedback } = useChatActions();
  const [savingFeedback, setSavingFeedback] = useState(false);
  const rate = (rating: "positive" | "negative") => {
    if (!message || savingFeedback) return;
    setSavingFeedback(true);
    void submitFeedback(message.id, rating)
      .catch(() => undefined)
      .finally(() => setSavingFeedback(false));
  };
  return (
    <ActionBarPrimitive.Root className="study-chat-actions" hideWhenRunning autohide="never">
      <Tooltip content={copied ? "Copied" : "Copy message"}>
        <ActionBarPrimitive.Copy aria-label="Copy message">
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span className="p-sr-only">{copied ? "Copied" : "Copy"}</span>
        </ActionBarPrimitive.Copy>
      </Tooltip>
      {message?.isSaved && message.role === "user" && (
        <Tooltip content="Edit question">
          <ActionBarPrimitive.Edit aria-label="Edit question" disabled={busy}>
            <Pencil size={15} />
          </ActionBarPrimitive.Edit>
        </Tooltip>
      )}
      {message?.isSaved && message.role === "assistant" && (
        <>
          <Tooltip content="Generate another answer">
            <ActionBarPrimitive.Reload aria-label="Regenerate response" disabled={busy}>
              <RotateCcw size={15} />
            </ActionBarPrimitive.Reload>
          </Tooltip>
          <Tooltip content="Helpful">
            <button
              type="button"
              onClick={() => rate("positive")}
              aria-label="Helpful response"
              aria-pressed={message.feedback === "positive"}
              disabled={busy || savingFeedback}
            >
              <ThumbsUp size={15} />
            </button>
          </Tooltip>
          <Tooltip content="Unhelpful">
            <button
              type="button"
              onClick={() => rate("negative")}
              aria-label="Unhelpful response"
              aria-pressed={message.feedback === "negative"}
              disabled={busy || savingFeedback}
            >
              <ThumbsDown size={15} />
            </button>
          </Tooltip>
        </>
      )}
      <BranchPickerPrimitive.Root className="study-chat-branches" hideWhenSingleBranch>
        <BranchPickerPrimitive.Previous aria-label="Previous branch" disabled={busy}>
          <ChevronLeft size={15} />
        </BranchPickerPrimitive.Previous>
        <span>
          <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
        </span>
        <BranchPickerPrimitive.Next aria-label="Next branch" disabled={busy}>
          <ChevronRight size={15} />
        </BranchPickerPrimitive.Next>
      </BranchPickerPrimitive.Root>
    </ActionBarPrimitive.Root>
  );
}

export function UserMessage(): React.ReactElement {
  const id = useAuiState((state) => state.message.id);
  return (
    <MessagePrimitive.Root
      className="study-chat-message aui-user-message-root"
      data-slot="aui_user-message-root"
      data-role="user"
      id={`chat-message-${id}`}
      tabIndex={-1}
    >
      <div className="study-chat-turn">
        <div className="study-chat-message-attachments">
          <MessagePrimitive.Attachments>{() => <ChatAttachment />}</MessagePrimitive.Attachments>
        </div>
        <div className="study-chat-bubble" data-role="user">
          <MessagePrimitive.Parts />
        </div>
      </div>
      <CopyAction />
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage(): React.ReactElement {
  const message = useOriginalMessage();
  const waiting =
    message?.status === "running" &&
    (!message.content || message.tools?.some((tool) => tool.status === "running"));
  const currentProgress = message?.progress
    ?.slice()
    .reverse()
    .find((update) => !message.activity || update.code === message.activity);
  const empty =
    !message?.content &&
    !message?.thinking &&
    !message?.progress?.length &&
    !message?.artifacts?.length &&
    !message?.tools?.length;
  return (
    <MessagePrimitive.Root
      className="study-chat-message aui-assistant-message-root"
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      id={`chat-message-${message?.id}`}
      tabIndex={-1}
    >
      <div className="study-chat-turn">
        <div className="study-chat-bubble" data-role="assistant">
          {waiting && (
            <div className="study-chat-live-status">
              <ThinkingStatus label={currentProgress?.label} />
            </div>
          )}
          <MessagePrimitive.Parts
            components={{
              Text: ChatMarkdown,
              Reasoning: ChatReasoning,
              tools: { Fallback: ChatTool },
            }}
          />
          {empty && message?.status !== "error" && message?.status !== "running" && (
            <p className="study-chat-response-state">
              {message?.status === "cancelled" ? "Response stopped." : "No response was returned."}
            </p>
          )}
          {message?.status === "error" && (
            <p className="study-chat-message-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>
                {message.error || "The response could not be completed. Please try again."}
              </span>
            </p>
          )}
          <MessageExtras />
          {message?.status === "cancelled" && !empty && (
            <p className="study-chat-response-state">Response stopped.</p>
          )}
        </div>
      </div>
      {!!message?.content && <CopyAction />}
    </MessagePrimitive.Root>
  );
}
