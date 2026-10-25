"""Public deck summaries and references from backend-executed retrieval only."""

import re
from urllib.parse import quote, urlsplit

from app.models.presentation import PresentationSource


def _plain(value: str) -> str:
    return re.sub(r"([\\`*_{}\[\]<>()#!|])", r"\\\1", " ".join(value.split()))


def _web_url(value: object) -> str | None:
    if not isinstance(value, str) or len(value) > 1000 or re.search(r"[\s\\<>]", value):
        return None
    try:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"https", "http"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
        ):
            return None
    except ValueError:
        return None
    return quote(value, safe="/:?&=#%@+-_.~")


def merge_presentation_sources(
    existing: list[PresentationSource], tool_name: str, result: object
) -> list[PresentationSource]:
    """Bound and deduplicate actual backend results; never inspect model tool arguments."""
    rows: list[object] = []
    if isinstance(result, dict) and not result.get("error"):
        if tool_name == "web_search" and result.get("status") == "success":
            value = result.get("results")
            if isinstance(value, list):
                rows = value[:16]
        elif tool_name == "rag_search":
            value = result.get("citations")
            if isinstance(value, list):
                rows = value[:16]
        elif tool_name == "read_document" and isinstance(result.get("total_pages"), int):
            rows = [result]
    candidates = [source.model_dump() for source in existing[:16]]
    candidates.extend(row for row in rows if isinstance(row, dict))
    sources: list[PresentationSource] = []
    seen: set[tuple[str, str | None]] = set()
    for row in candidates:
        title = row.get("title")
        if not isinstance(title, str) or not title.strip():
            continue
        title = " ".join(title.split())[:200]
        url = _web_url(row.get("url"))
        identity = (title.casefold(), url)
        if identity in seen:
            continue
        seen.add(identity)
        sources.append(PresentationSource(title=title, url=url))
        if len(sources) == 16:
            break
    return sources


def presentation_confirmation(content: dict[str, object]) -> str:
    count = content.get("slides_count")
    opening = (
        f"Your {count}-slide presentation is ready to preview and download."
        if type(count) is int
        else "Your presentation is ready to preview and download."
    )
    overview = content.get("overview")
    if isinstance(overview, str) and overview.strip():
        detail = _plain(overview[:600])
    else:
        titles = content.get("slide_titles")
        topics = (
            [title for title in titles[1:] if isinstance(title, str)]
            if isinstance(titles, list)
            else []
        )
        detail = (
            "It covers " + ", ".join(_plain(title[:100]) for title in topics[:6]) if topics else ""
        )
        if len(topics) > 6:
            detail += f", plus {len(topics) - 6} additional topics"
        if detail:
            detail += "."
    if isinstance(overview, str) and overview.strip():
        blocks = [detail]
    else:
        blocks = [opening, detail] if detail else [opening]
    raw_sources = content.get("sources")
    sources = merge_presentation_sources(
        [], "rag_search", {"citations": raw_sources if isinstance(raw_sources, list) else []}
    )
    if sources:
        references = []
        for source in sources[:8]:
            label = _plain(source.title)
            references.append(f"- [{label}](<{source.url}>)" if source.url else f"- {label}")
        blocks.append("**References supplied with this deck**\n" + "\n".join(references))
        if len(sources) > 8:
            blocks.append(
                f"{len(sources) - 8} more references are listed in the preview's Sources section."
            )
    else:
        blocks.append("No source references were attached to this deck.")
    return "\n\n".join(blocks)
