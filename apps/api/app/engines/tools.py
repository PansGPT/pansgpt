# ==============================================================================
# PansGPT 2.0 Core AI Tools & Function Calling Schemas (Phase 6)
# ==============================================================================

import asyncio
import uuid
from typing import Any

import structlog

from app.core.config import settings
from app.core.database import get_db_connection
from app.engines.rag import rag_engine
from app.models.web_search import SearchScope

logger = structlog.get_logger(__name__)


# ------------------------------------------------------------------------------
# 1. Standard Function Calling Tool Definitions
# ------------------------------------------------------------------------------
CORE_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "rag_search",
            "description": (
                "Search verified university pharmacy lecture notes and course monographs for "
                "pharmacological mechanisms, drug indications, contraindications, adverse reactions, and dosages."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g. 'Mechanism of action of ACE inhibitors in hypertension')",
                    },
                    "document_id": {
                        "type": "string",
                        "description": "Optional UUID of a specific course monograph to restrict the search to.",
                    },
                    "course_code": {
                        "type": "string",
                        "description": "Optional university course code (e.g. 'PCL301', 'PCO402').",
                    },
                    "match_count": {
                        "type": "integer",
                        "description": "Number of relevant chunks to retrieve (1 to 8, default 4).",
                        "default": 4,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_document",
            "description": (
                "Directly read pages or excerpts from an uploaded pharmacy course document."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "UUID of the document to inspect.",
                    },
                    "page_number": {
                        "type": "integer",
                        "description": "Specific slide or page number to read (1-indexed).",
                    },
                },
                "required": ["document_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search public web facts using the backend-authorized general or biomedical scope. "
                "Use a minimal standalone public query; never send patient details, private excerpts, credentials or private URLs."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A public standalone query, at most 400 characters; use explicit dates for time-sensitive facts.",
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of web citations to return (default 3).",
                        "default": 3,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vision_analyze",
            "description": (
                "Inspect and analyze histological microscopy slides, chemical structures, "
                "or pharmacokinetics charts uploaded as images."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "attachment_id": {
                        "type": "string",
                        "description": "Owned image attachment UUID supplied in the current conversation context. Never a URL or storage key.",
                    },
                    "prompt": {
                        "type": "string",
                        "description": "Specific clinical or histological question about the image.",
                    },
                },
                "required": ["attachment_id"],
            },
        },
    },
]


# ------------------------------------------------------------------------------
# 2. Tool Execution Implementations
# ------------------------------------------------------------------------------
class ToolExecutionEngine:
    """Executes registered tool functions on behalf of the agentic LLM."""

    @staticmethod
    async def execute_rag_search(
        query: str,
        document_id: str | None = None,
        course_code: str | None = None,
        match_count: int = 4,
        university_id: str | None = None,
        user_id: str | None = None,
        role: str = "student",
        levels: list[str] | None = None,
    ) -> dict[str, Any]:
        """Executes 3-pool hybrid RAG search against course notes."""
        context, citations = await rag_engine.retrieve_context(
            query=query,
            document_id=document_id,
            university_id=university_id,
            course_code=course_code,
            match_count=min(max(match_count, 1), 8),
            user_id=user_id,
            role=role,
            expand_siblings=True,
            levels=levels,
        )
        return {
            "found_chunks": len(citations),
            "context": context
            or "No relevant monograph chunks found matching this query in syllabus.",
            "citations": [c.model_dump() for c in citations],
        }

    @staticmethod
    async def execute_read_document(
        document_id: str,
        page_number: int | None = None,
        university_id: str | None = None,  # [TENANT FIX]
    ) -> dict[str, Any]:
        """Reads document content from database chunks."""
        if university_id is None:  # [TENANT FIX]
            raise ValueError("university_id is required to read a document.")  # [TENANT FIX]
        try:
            doc_uuid = uuid.UUID(document_id)
        except ValueError:
            return {"error": "Invalid document UUID format"}

        async with get_db_connection() as conn:
            if not conn:
                return {
                    "title": "Document Excerpt",
                    "content": "Database unreachable in offline mode. Document preview unavailable.",
                    "pages": 0,
                }

            doc_row = await conn.fetchrow(
                "SELECT title, course_code, page_count AS total_pages FROM public.documents WHERE id = $1 AND university_id = $2 AND status = 'active' AND deleted_at IS NULL",  # [TENANT FIX]
                doc_uuid,
                uuid.UUID(university_id),  # [TENANT FIX]
            )
            if not doc_row:
                return {"error": f"Document {document_id} not found."}

            if page_number is not None:
                chunk_rows = await conn.fetch(
                    """
                    SELECT content, page_start, page_end
                    FROM public.document_chunks
                    WHERE document_id = $1 AND ($2 BETWEEN page_start AND page_end)
                    ORDER BY chunk_index ASC;
                    """,
                    doc_uuid,
                    page_number,
                )
            else:
                chunk_rows = await conn.fetch(
                    """
                    SELECT content, page_start, page_end
                    FROM public.document_chunks
                    WHERE document_id = $1
                    ORDER BY chunk_index ASC
                    LIMIT 5;
                    """,
                    doc_uuid,
                )

            extracted_text = "\n\n".join(r["content"] for r in chunk_rows)
            return {
                "title": doc_row["title"],
                "course_code": doc_row["course_code"],
                "total_pages": doc_row["total_pages"],
                "page_requested": page_number,
                "content": extracted_text or "No extracted text available for requested page.",
            }

    @staticmethod
    async def execute_web_search(
        query: str,
        num_results: int = 3,
        user_id: str | None = None,
        role: str = "student",
        scope: SearchScope = "biomedical",
        public_query: bool = False,
        current_information: bool = False,
    ) -> dict[str, Any]:
        """Queries biomedical literature via Tavily with user daily quotas and MD5 caching."""
        from app.engines.web_search import web_search_engine

        return await web_search_engine.search(
            query=query,
            num_results=num_results,
            user_id=user_id,
            role=role,
            scope=scope,
            public_query=public_query,
            current_information=current_information,
        )

    @staticmethod
    async def execute_vision_analyze(
        attachment_id: str,
        prompt: str,
        user_id: str | None,
        university_id: str | None,
        session_id: str | None,
    ) -> dict[str, object]:
        from app.engines.chat_images import analyze_image, owned_image

        if not user_id or not university_id or not session_id:
            return {
                "status": "error",
                "error": "An owned image attachment in this conversation is required.",
            }
        try:
            async with asyncio.timeout(settings.VISION_OVERALL_TIMEOUT_SECONDS):
                image = await owned_image(attachment_id, session_id, user_id, university_id)
                analysis = await analyze_image(image, prompt, session_id, user_id, university_id)
            return {"status": "success", "attachment_id": attachment_id, "analysis": analysis}
        except Exception as exc:
            logger.warning("chat_image_tool_failed", error_type=type(exc).__name__)
            return {
                "status": "error",
                "error": "This image could not be analysed in the current conversation. Please retry.",
            }

    async def dispatch_tool(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        university_id: str | None = None,
        user_id: str | None = None,
        role: str = "student",
        levels: list[str] | None = None,
        session_id: str | None = None,
        web_search_scope: SearchScope = "biomedical",
        public_web_search: bool = False,
        current_information: bool = False,
    ) -> dict[str, Any]:
        """Dispatches an agentic function tool call by name."""
        logger.info("tool_dispatch_requested", tool_name=tool_name)
        try:
            if tool_name == "rag_search":
                return await self.execute_rag_search(
                    query=arguments.get("query", ""),
                    document_id=arguments.get("document_id"),
                    course_code=arguments.get("course_code"),
                    match_count=arguments.get("match_count", 4),
                    university_id=university_id,
                    user_id=user_id,
                    role=role,
                    levels=levels,
                )
            elif tool_name == "read_document":
                return await self.execute_read_document(
                    document_id=arguments.get("document_id", ""),
                    page_number=arguments.get("page_number"),
                    university_id=university_id,  # [TENANT FIX]
                )
            elif tool_name == "web_search":
                return await self.execute_web_search(
                    query=arguments.get("query", ""),
                    num_results=arguments.get("num_results", 3),
                    user_id=user_id,
                    role=role,
                    scope=web_search_scope,
                    public_query=public_web_search,
                    current_information=current_information,
                )
            elif tool_name == "vision_analyze":
                return await self.execute_vision_analyze(
                    attachment_id=str(arguments.get("attachment_id", "")),
                    prompt=arguments.get("prompt", "Analyze this image"),
                    user_id=user_id,
                    university_id=university_id,
                    session_id=session_id,
                )
            else:
                return {"error": f"Unknown tool name: {tool_name}"}
        except Exception as exc:
            logger.error("tool_execution_failed", tool=tool_name, error=str(exc))
            return {"error": f"Tool execution failed: {str(exc)}"}


tool_engine = ToolExecutionEngine()


def get_all_tool_definitions() -> list[dict[str, Any]]:
    """Returns combined registry of Core Tools and Dynamic Workspace Skills in standard function calling schema."""
    from app.engines.skills import SKILL_TOOL_DEFINITIONS

    return list(CORE_TOOL_DEFINITIONS) + list(SKILL_TOOL_DEFINITIONS)
