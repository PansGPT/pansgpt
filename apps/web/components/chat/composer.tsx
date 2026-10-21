"use client";
import { useEffect, useRef, type FormEvent } from "react";
import { ArrowUp, AudioLines, Mic, Plus, Square } from "lucide-react";

export function ChatComposer({
  prompt,
  onChange,
  onSubmit,
  streaming,
  onStop,
}: {
  prompt: string;
  onChange: (prompt: string) => void;
  onSubmit: (event?: FormEvent) => void;
  streaming: boolean;
  onStop: () => void;
}): React.ReactElement {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, 140)}px`;
  }, [prompt]);
  return (
    <form className="study-chat-composer" onSubmit={onSubmit}>
      <button
        type="button"
        className="study-chat-add"
        aria-label="Attach study material"
        title="Document attachments are coming soon"
        disabled
      >
        <Plus size={28} aria-hidden="true" />
      </button>
      <textarea
        ref={input}
        aria-label="Study question"
        placeholder="Message PansGPT…"
        value={prompt}
        rows={1}
        maxLength={10000}
        onChange={(event) => onChange(event.target.value)}
        disabled={streaming}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (prompt.trim() && !streaming) onSubmit();
          }
        }}
      />
      <button
        type="button"
        className="study-chat-mic"
        aria-label="Voice input"
        title="Voice input is coming soon"
        disabled
      >
        <Mic size={25} aria-hidden="true" />
      </button>
      {streaming ? (
        <button
          type="button"
          className="study-chat-send"
          aria-label="Stop generating"
          onClick={onStop}
        >
          <Square size={22} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="submit"
          className="study-chat-send"
          aria-label={prompt.trim() ? "Send message" : "Voice chat"}
          disabled={!prompt.trim()}
          title={prompt.trim() ? "Send message" : "Voice chat is coming soon"}
        >
          {prompt.trim() ? (
            <ArrowUp size={27} aria-hidden="true" />
          ) : (
            <AudioLines size={28} aria-hidden="true" />
          )}
        </button>
      )}
    </form>
  );
}
