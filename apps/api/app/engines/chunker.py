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
    bounding_box: dict | None = None


class SemanticChunker:
    """
    Splits document elements into vector retrieval chunks:
    - Tables: Atomic (1 Table = 1 Chunk, never split)
    - Diagrams: Atomic (1 Diagram = 1 Chunk, never split)
    - Text: Segment-bounded recursive splitting (512 tokens, approximately 10% overlap)
    """

    def __init__(
        self,
        max_tokens: int = 512,
        overlap_tokens: int = 51,
        encoding_name: str = "cl100k_base",
    ) -> None:
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

        if not 0 <= overlap_tokens < max_tokens:
            raise ValueError("Overlap must be smaller than the chunk size")
        if self._tokenizer:
            tokens = self._tokenizer.encode(text, disallowed_special=())
            chunks = []
            start = 0
            while start < len(tokens):
                end = min(start + max_tokens, len(tokens))
                # Prefer a paragraph/sentence boundary when one exists near the end.
                if end < len(tokens):
                    for boundary in range(end, start + max_tokens // 2, -1):
                        suffix = self._tokenizer.decode(tokens[max(start, boundary - 2) : boundary])
                        if suffix.endswith(("\n\n", ". ", "; ")):
                            end = boundary
                            break
                chunks.append(self._tokenizer.decode(tokens[start:end]))
                if end == len(tokens):
                    break
                start = max(start + 1, end - overlap_tokens)
            return chunks
        # Conservative character windows keep the fallback estimate bounded too.
        width = max_tokens * 4
        step = (max_tokens - overlap_tokens) * 4
        return [text[start : start + width] for start in range(0, len(text), step)]

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
            bbox = el.get("bounding_box")

            if not content:
                continue

            # Invariant: Tables and Diagrams are ALWAYS atomic
            if ctype in ("table", "diagram"):
                if self.count_tokens(content) > 8192:
                    raise ValueError(
                        "Atomic table or diagram exceeds the 8192-token embedding limit; simplify the source element before retrying"
                    )
                all_chunks.append(
                    DocumentChunkItem(
                        content=content,
                        content_type=ctype,
                        page_start=page_num,
                        page_end=page_num,
                        chunk_index=chunk_idx,
                        segment_id=seg_id,
                        element_id=el_id,
                        bounding_box=bbox,
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
                cursor = 0
                for split in text_splits:
                    chunk_bbox = bbox
                    start = content.find(split, cursor)
                    if start >= 0:
                        cursor = start + 1
                        rects = [
                            line["bbox"]
                            for line in (bbox or {}).get("lines", [])
                            if line["start"] < start + len(split) and line["end"] > start
                        ]
                        if rects:
                            chunk_bbox = {
                                key: value
                                for key, value in bbox.items()
                                if key not in {"lines", "rects", "bbox"}
                            }
                            chunk_bbox.update(
                                rects=rects,
                                bbox=[
                                    min(r[0] for r in rects),
                                    min(r[1] for r in rects),
                                    max(r[2] for r in rects),
                                    max(r[3] for r in rects),
                                ],
                                precision="line",
                            )
                    all_chunks.append(
                        DocumentChunkItem(
                            content=split,
                            content_type="text",
                            page_start=page_num,
                            page_end=page_num,
                            chunk_index=chunk_idx,
                            segment_id=seg_id,
                            element_id=el_id,
                            bounding_box=chunk_bbox,
                        )
                    )
                    chunk_idx += 1

        return all_chunks


semantic_chunker = SemanticChunker()
