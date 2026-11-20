/** Explicit Retry can repeat searches. Unknown and artifact tools stay fenced. */
export function retrySafeTool(toolName: string): boolean {
  return toolName === "web_search" || toolName === "rag_search" || toolName === "read_document";
}
