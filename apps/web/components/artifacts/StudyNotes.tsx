"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ArtifactItem } from "@pansgpt/types";
import { DocumentCard } from "./DocumentCard";
import { RichDisclosure } from "./RichCard";
import { safeChatLink } from "@/lib/chat-message";
export function StudyNotes({ artifact }: { artifact: ArtifactItem }) {
  return (
    <div>
      <DocumentCard artifact={artifact} />
      {typeof artifact.content === "string" && (
        <RichDisclosure label="Read study notes">
          <div className="chat-notes-preview study-chat-markdown">
            <Markdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              skipHtml
              components={{
                a: ({ href, children }) => {
                  const url = safeChatLink(href);
                  return url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ) : (
                    <span>{children}</span>
                  );
                },
                img: ({ alt }) => <span>{alt || "Image"} (image preview unavailable)</span>,
              }}
            >
              {artifact.content.slice(0, 100000)}
            </Markdown>
          </div>
        </RichDisclosure>
      )}
    </div>
  );
}
