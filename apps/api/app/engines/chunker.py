# ==============================================================================
# Semantic Chunker Engine (Stage 8)
# Segment-bounded recursive text chunking with atomic tables and diagrams
# ==============================================================================

from dataclasses import dataclass
from typing import Literal

import tiktoken

ContentType = Literal["text", "diagram", "table"]


@dataclass
class DocumentChunkItem:
    content: str
    content_type: ContentType
    page_start: int
    page_end: int
    chunk_index: int
    segment_id: str | None = None
    element_id: str | None = None


class SemanticChunker:
    """
    Splits document elements into vector retrieval chunks:
    - Tables: Atomic (1 Table = 1 Chunk, never split)
    - Diagrams: Atomic (1 Diagram = 1 Chunk, never split)
    - Text: Segment-bounded recursive splitting (512 tokens, 64-token overlap)
    """

    def __init__(
        self,
        max_tokens: int = 512,
        overlap_tokens: int = 64,
        encoding_name: str = "cl100k_base",
    ):
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        try:
            self._tokenizer = tiktoken.get_encoding(encoding_name)
        except Exception:
            self._tokenizer = None

    def count_tokens(self, text: str) -> int:
        if self._tokenizer:
            return len(self._tokenizer.encode(text, disallowed_special=()))
        # Fallback estimation: ~4 chars per token
        return max(1, len(text) // 4)

    def split_text_recursive(self, text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
        """
        Recursively split text by paragraphs (\n\n), sentences (. ), or words.
        """
        text = text.strip()
        if not text:
            return []

        if self.count_tokens(text) <= max_tokens:
            return [text]

        chunks: list[str] = []
        # Split by double newline first
        paragraphs = text.split("\n\n")
        current_chunk: list[str] = []
        current_tokens = 0

        for p in paragraphs:
            p_str = p.strip()
            if not p_str:
                continue
            p_tokens = self.count_tokens(p_str)

            if p_tokens > max_tokens:
                # If a single paragraph is too large, split it by sentence
                sentences = p_str.replace(". ", ".\n").split("\n")
                for s in sentences:
                    s_str = s.strip()
                    if not s_str:
                        continue
                    s_tokens = self.count_tokens(s_str)
                    if current_tokens + s_tokens > max_tokens and current_chunk:
                        chunk_body = "\n\n".join(current_chunk)
                        chunks.append(chunk_body)
                        # Overlap: keep last piece if small
                        current_chunk = (
                            [current_chunk[-1]] if current_tokens > overlap_tokens else []
                        )
                        current_tokens = self.count_tokens("\n\n".join(current_chunk))
                    current_chunk.append(s_str)
                    current_tokens += s_tokens
            else:
                if current_tokens + p_tokens > max_tokens and current_chunk:
                    chunk_body = "\n\n".join(current_chunk)
                    chunks.append(chunk_body)
                    current_chunk = [current_chunk[-1]] if current_tokens > overlap_tokens else []
                    current_tokens = self.count_tokens("\n\n".join(current_chunk))
                current_chunk.append(p_str)
                current_tokens += p_tokens

        if current_chunk:
            chunk_body = "\n\n".join(current_chunk)
            if not chunks or chunks[-1] != chunk_body:
                chunks.append(chunk_body)

        return chunks

    def create_chunks_for_elements(
        self,
        elements: list[dict],
    ) -> list[DocumentChunkItem]:
        """
        Given extracted elements, produce ordered DocumentChunkItems.
        Each element dict has:
        - content_type: 'text' | 'table' | 'diagram'
        - raw_content: str
        - page_number: int
        - segment_id: Optional[str]
        - element_id: Optional[str]
        """
        all_chunks: list[DocumentChunkItem] = []
        chunk_idx = 0

        for el in elements:
            ctype = el.get("content_type", "text")
            content = el.get("raw_content", "").strip()
            page_num = el.get("page_number", 1)
            seg_id = el.get("segment_id")
            el_id = el.get("element_id")

            if not content:
                continue

            # Invariant: Tables and Diagrams are ALWAYS atomic
            if ctype in ("table", "diagram"):
                all_chunks.append(
                    DocumentChunkItem(
                        content=content,
                        content_type=ctype,
                        page_start=page_num,
                        page_end=page_num,
                        chunk_index=chunk_idx,
                        segment_id=seg_id,
                        element_id=el_id,
                    )
                )
                chunk_idx += 1
            else:
                # Text: segment-bounded recursive split
                text_splits = self.split_text_recursive(
                    content,
                    max_tokens=self.max_tokens,
                    overlap_tokens=self.overlap_tokens,
                )
                for split in text_splits:
                    all_chunks.append(
                        DocumentChunkItem(
                            content=split,
                            content_type="text",
                            page_start=page_num,
                            page_end=page_num,
                            chunk_index=chunk_idx,
                            segment_id=seg_id,
                            element_id=el_id,
                        )
                    )
                    chunk_idx += 1

        return all_chunks


semantic_chunker = SemanticChunker()
