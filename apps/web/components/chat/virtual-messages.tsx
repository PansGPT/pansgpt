"use client";

import { ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AssistantMessage, UserMessage } from "./message";
import { ChatEditComposer } from "./composer";

const components = { UserMessage, AssistantMessage, EditComposer: ChatEditComposer };

export function ChatMessages({
  viewport,
}: {
  viewport: HTMLDivElement | null;
}): React.ReactElement {
  "use no memo";
  const messages = useAuiState((state) => state.thread.messages);
  // TanStack owns a mutable measurement instance; this component opts out of React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtual = useVirtualizer({
    count: messages.length,
    getScrollElement: () => viewport,
    estimateSize: () => 220,
    getItemKey: (index) => messages[index]!.id,
    overscan: 6,
    useAnimationFrameWithResizeObserver: true,
    enabled: messages.length > 80,
  });
  const target = useSearchParams().get("message");
  const targetIndex = messages.findIndex((message) => message.id === target);
  const isVirtualized = messages.length > 80;
  useEffect(() => {
    if (!target || !viewport) return;
    if (targetIndex < 0) return;
    if (isVirtualized) virtual.scrollToIndex(targetIndex, { align: "center" });
    let frame = 0,
      tries = 0;
    let element: HTMLElement | null = null;
    const locate = () => {
      element = document.getElementById(`chat-message-${target}`);
      if (element) {
        element.scrollIntoView({ block: "center" });
        element.focus({ preventScroll: true });
        element.dataset.searchMatch = "true";
      } else if (tries++ < 20) frame = requestAnimationFrame(locate);
    };
    frame = requestAnimationFrame(locate);
    return () => {
      cancelAnimationFrame(frame);
      element?.removeAttribute("data-search-match");
    };
  }, [target, viewport, targetIndex, isVirtualized, virtual]);
  if (messages.length <= 80) return <ThreadPrimitive.Messages components={components} />;
  return (
    <div
      className="study-chat-virtual"
      data-virtualized="true"
      style={{ height: virtual.getTotalSize() }}
    >
      {virtual.getVirtualItems().map((item) => (
        <div
          key={item.key}
          data-index={item.index}
          ref={virtual.measureElement}
          className="study-chat-virtual-row"
          style={{ transform: `translateY(${item.start}px)` }}
        >
          <ThreadPrimitive.MessageByIndex index={item.index} components={components} />
        </div>
      ))}
    </div>
  );
}
