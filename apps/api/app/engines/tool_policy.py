"""Only known read-only tools may be repeated by a student's explicit Retry."""

READ_ONLY_TOOLS = frozenset({"web_search", "rag_search", "read_document"})


def retry_safe_tool(tool_name: str) -> bool:
    # Unknown/dynamic tools remain fenced until their effects are reviewed.
    return tool_name in READ_ONLY_TOOLS
