"use client";
import { useEffect, useId, useState } from "react";
import { safeDiagramSource } from "@/lib/study-artifacts";
import { RichDisclosure } from "./RichCard";
let queue: Promise<unknown> = Promise.resolve();
export function DiagramView({ code, pending = false }: { code: string; pending?: boolean }) {
  const id = useId().replace(/[^a-z0-9]/gi, "");
  const [result, setResult] = useState<{ code: string; html?: string }>();
  useEffect(() => {
    let cancelled = false;
    if (pending || !safeDiagramSource(code)) return;
    queue = queue
      .catch(() => undefined)
      .then(async () => {
        if (cancelled) return;
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          maxTextSize: 12000,
          maxEdges: 200,
          theme: "neutral",
          flowchart: { htmlLabels: false },
          fontFamily: "system-ui",
        });
        const { svg } = await mermaid.render(`diagram-${id}`, code);
        if (!cancelled)
          setResult({
            code,
            html: `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"><style>body{margin:0;padding:12px;background:transparent}svg{width:100%;height:auto;max-height:360px}</style>${svg}`,
          });
      })
      .catch(() => {
        if (!cancelled) setResult({ code });
      });
    return () => {
      cancelled = true;
    };
  }, [code, id, pending]);
  const safe = safeDiagramSource(code);
  return (
    <div className="chat-diagram">
      {!pending && result?.code === code && result.html ? (
        <iframe
          title="Study diagram"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={result.html}
        />
      ) : (
        <p className="chat-rich-muted" role="status">
          {!pending && (!safe || result?.code === code)
            ? "This diagram couldn’t be displayed. Its source is available below."
            : "Drawing diagram…"}
        </p>
      )}
      <RichDisclosure label="Diagram source">
        <pre>{code.slice(0, 12000)}</pre>
      </RichDisclosure>
    </div>
  );
}
