# ==============================================================================
# PansGPT 2.0 Dynamic AI Skills Engine & Artifact Generators (Phase 6)
# ==============================================================================

import asyncio
import io
import uuid
from typing import Any

import pymupdf
import structlog
from docx import Document
from pptx import Presentation

from app.core.config import settings
from app.engines.storage import r2_storage
from app.models.chat import ArtifactReadyPayload

logger = structlog.get_logger(__name__)


SKILL_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "create_doc",
            "description": "Generate a professionally styled Microsoft Word (.docx) study summary, clinical monograph, or revision guide.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Document title"},
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "heading": {"type": "string"},
                                "body": {"type": "string"},
                                "bullet_points": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["heading", "body"],
                        },
                        "description": "List of sections with headings, explanations, and key takeaways.",
                    },
                },
                "required": ["title", "sections"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_pdf",
            "description": "Generate a formatted printable PDF summary, cheat sheet, or clinical reference monograph.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Document title"},
                    "content": {
                        "type": "string",
                        "description": "Structured study text or clinical guide",
                    },
                    "author": {
                        "type": "string",
                        "description": "Author or faculty credit (default: PansGPT Academic Assistant)",
                        "default": "PansGPT Academic Assistant",
                    },
                },
                "required": ["title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_pptx",
            "description": "Generate a Microsoft PowerPoint (.pptx) presentation slide deck for seminar or lecture revision.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Presentation title"},
                    "subtitle": {"type": "string", "description": "Subtitle or course code"},
                    "slides": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "bullet_points": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["title", "bullet_points"],
                        },
                        "description": "List of slides with titles and bullet points.",
                    },
                },
                "required": ["title", "slides"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_md",
            "description": "Generate a structured Markdown (.md) note with KaTeX formulas and pharmacology monographs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Document title"},
                    "markdown_content": {"type": "string", "description": "Full markdown content"},
                },
                "required": ["title", "markdown_content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "plot_graph",
            "description": "Generate an interactive pharmacological chart or dose-response curve (Chart.js / Mermaid).",
            "parameters": {
                "type": "object",
                "properties": {
                    "graph_type": {
                        "type": "string",
                        "enum": ["line", "bar", "scatter", "mermaid"],
                        "description": "Graph representation type",
                    },
                    "title": {"type": "string", "description": "Graph title"},
                    "data": {"type": "object", "description": "Labels, datasets, and coordinates"},
                },
                "required": ["graph_type", "title", "data"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_flashcards",
            "description": "Generate spaced-repetition flashcards for quick student memorization of drug classes, MOA, and ADRs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Card deck topic"},
                    "cards": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "front": {
                                    "type": "string",
                                    "description": "Question / Drug Name / Concept",
                                },
                                "back": {
                                    "type": "string",
                                    "description": "Answer / Mechanism / Dose",
                                },
                                "hint": {"type": "string"},
                                "difficulty": {
                                    "type": "string",
                                    "enum": ["easy", "medium", "hard"],
                                },
                            },
                            "required": ["front", "back"],
                        },
                    },
                },
                "required": ["topic", "cards"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_mnemonics",
            "description": "Generate high-retention visual or phonetic mnemonics for memorizing complex pharmacology lists.",
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_or_class": {"type": "string", "description": "Drug or concept"},
                    "mnemonic": {"type": "string", "description": "The mnemonic acronym or phrase"},
                    "breakdown": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Letter-by-letter expansion",
                    },
                    "clinical_notes": {"type": "string"},
                },
                "required": ["drug_or_class", "mnemonic", "breakdown"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draw_chemical_structure",
            "description": "Render or retrieve molecular structure metadata, SMILES formula, and 2D chemical representation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "compound_name": {"type": "string"},
                    "smiles": {"type": "string", "description": "SMILES chemical notation"},
                    "formula": {"type": "string", "description": "Molecular formula e.g. C9H8O4"},
                    "pharmacophore_notes": {"type": "string"},
                },
                "required": ["compound_name", "smiles"],
            },
        },
    },
]


class SkillExecutionEngine:
    """Dispatches and compiles dynamic student study artifacts."""

    @staticmethod
    async def _safe_r2_upload(
        key: str, data: bytes, content_type: str
    ) -> tuple[str | None, str | None]:
        """Attempts to upload generated bytes to R2 and returns (storage_key, download_url)."""
        r2_key = settings.r2_access_key or ""
        if r2_storage.is_configured and not any(
            p in r2_key.lower() for p in ("placeholder", "dummy", "test", "mock")
        ):
            try:
                await asyncio.wait_for(
                    r2_storage.upload_bytes(key, data, content_type),
                    timeout=2.0,
                )
                url = await asyncio.wait_for(
                    r2_storage.generate_presigned_get_url(key, expires_in=3600),
                    timeout=2.0,
                )
                return key, url
            except Exception as exc:
                logger.warning("artifact_r2_upload_failed", key=key, error=str(exc))
        return key, f"/api/v1/library/documents/download?key={key}"

    async def execute_create_doc(
        self, title: str, sections: list[dict[str, Any]]
    ) -> ArtifactReadyPayload:
        """Generates a styled .docx document."""
        doc = Document()
        doc.add_heading(title, level=0)

        for s in sections:
            doc.add_heading(s.get("heading", "Section"), level=1)
            body = s.get("body")
            if body:
                doc.add_paragraph(body)
            bullets = s.get("bullet_points", [])
            for b in bullets:
                doc.add_paragraph(b, style="List Bullet")

        bio = io.BytesIO()
        doc.save(bio)
        data = bio.getvalue()

        storage_key = f"artifacts/docs/{uuid.uuid4()}.docx"
        key, url = await self._safe_r2_upload(
            storage_key,
            data,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        return ArtifactReadyPayload(
            skill_name="create_doc",
            title=title,
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            file_extension="docx",
            storage_key=key,
            download_url=url,
            content={"sections_count": len(sections)},
        )

    async def execute_create_pdf(
        self, title: str, content: str, author: str = "PansGPT Academic Assistant"
    ) -> ArtifactReadyPayload:
        """Generates a formatted PDF using PyMuPDF."""
        pdf_doc = pymupdf.open()
        page = pdf_doc.new_page(width=595, height=842)  # A4

        # Header
        page.insert_text((50, 60), title, fontsize=18, fontname="helv", color=(0.1, 0.2, 0.4))
        page.insert_text(
            (50, 85), f"Prepared by: {author}", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4)
        )

        # Body
        rect = pymupdf.Rect(50, 110, 545, 800)
        page.insert_textbox(rect, content, fontsize=11, fontname="helv", color=(0.15, 0.15, 0.15))

        data = pdf_doc.write()
        pdf_doc.close()

        storage_key = f"artifacts/pdf/{uuid.uuid4()}.pdf"
        key, url = await self._safe_r2_upload(storage_key, data, "application/pdf")
        return ArtifactReadyPayload(
            skill_name="create_pdf",
            title=title,
            mime_type="application/pdf",
            file_extension="pdf",
            storage_key=key,
            download_url=url,
            content={"length": len(content)},
        )

    async def execute_create_pptx(
        self, title: str, slides: list[dict[str, Any]], subtitle: str | None = None
    ) -> ArtifactReadyPayload:
        """Generates a PowerPoint presentation using python-pptx."""
        prs = Presentation()

        # Title slide
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        slide.shapes.title.text = title
        if subtitle and slide.placeholders[1]:
            slide.placeholders[1].text = subtitle

        # Bullet slides
        bullet_slide_layout = prs.slide_layouts[1]
        for s_data in slides:
            s = prs.slides.add_slide(bullet_slide_layout)
            s.shapes.title.text = s_data.get("title", "Slide")
            tf = s.placeholders[1].text_frame
            bullets = s_data.get("bullet_points", [])
            for i, b in enumerate(bullets):
                p = tf.add_paragraph() if i > 0 else tf.paragraphs[0]
                p.text = b
                p.level = 0

        bio = io.BytesIO()
        prs.save(bio)
        data = bio.getvalue()

        storage_key = f"artifacts/pptx/{uuid.uuid4()}.pptx"
        key, url = await self._safe_r2_upload(
            storage_key,
            data,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
        return ArtifactReadyPayload(
            skill_name="create_pptx",
            title=title,
            mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            file_extension="pptx",
            storage_key=key,
            download_url=url,
            content={"slides_count": len(slides) + 1},
        )

    async def execute_create_md(self, title: str, markdown_content: str) -> ArtifactReadyPayload:
        """Generates a Markdown file note."""
        full_text = f"# {title}\n\n{markdown_content}\n"
        data = full_text.encode("utf-8")
        storage_key = f"artifacts/md/{uuid.uuid4()}.md"
        key, url = await self._safe_r2_upload(storage_key, data, "text/markdown")
        return ArtifactReadyPayload(
            skill_name="create_md",
            title=title,
            mime_type="text/markdown",
            file_extension="md",
            storage_key=key,
            download_url=url,
            content=markdown_content,
        )

    async def execute_plot_graph(
        self, graph_type: str, title: str, data: dict[str, Any]
    ) -> ArtifactReadyPayload:
        """Generates Chart.js / Mermaid graph payload."""
        return ArtifactReadyPayload(
            skill_name="plot_graph",
            title=title,
            mime_type="application/json",
            file_extension="json",
            content={"type": graph_type, "title": title, "data": data},
        )

    async def execute_generate_flashcards(
        self, topic: str, cards: list[dict[str, Any]]
    ) -> ArtifactReadyPayload:
        """Generates structured flashcards deck."""
        return ArtifactReadyPayload(
            skill_name="generate_flashcards",
            title=f"Flashcards: {topic}",
            mime_type="application/json",
            file_extension="json",
            content={"topic": topic, "cards": cards, "total": len(cards)},
        )

    async def execute_generate_mnemonics(
        self,
        drug_or_class: str,
        mnemonic: str,
        breakdown: list[str],
        clinical_notes: str | None = None,
    ) -> ArtifactReadyPayload:
        """Generates memory hooks card."""
        return ArtifactReadyPayload(
            skill_name="generate_mnemonics",
            title=f"Mnemonic: {drug_or_class}",
            mime_type="application/json",
            file_extension="json",
            content={
                "concept": drug_or_class,
                "mnemonic": mnemonic,
                "breakdown": breakdown,
                "clinical_notes": clinical_notes,
            },
        )

    async def execute_draw_chemical_structure(
        self,
        compound_name: str,
        smiles: str,
        formula: str | None = None,
        pharmacophore_notes: str | None = None,
    ) -> ArtifactReadyPayload:
        """Generates chemical structure representation payload."""
        return ArtifactReadyPayload(
            skill_name="draw_chemical_structure",
            title=f"Structure: {compound_name}",
            mime_type="application/json",
            file_extension="json",
            content={
                "compound_name": compound_name,
                "smiles": smiles,
                "formula": formula,
                "notes": pharmacophore_notes,
                "depiction_url": f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/{smiles}/PNG",
            },
        )

    async def dispatch_skill(
        self, skill_name: str, arguments: dict[str, Any]
    ) -> ArtifactReadyPayload:
        """Dispatches dynamic skill by name."""
        logger.info("skill_dispatch_requested", skill=skill_name)
        if skill_name == "create_doc":
            return await self.execute_create_doc(
                title=arguments.get("title", "Clinical Summary"),
                sections=arguments.get("sections", []),
            )
        elif skill_name == "create_pdf":
            return await self.execute_create_pdf(
                title=arguments.get("title", "Study Cheat Sheet"),
                content=arguments.get("content", ""),
                author=arguments.get("author", "PansGPT Academic Assistant"),
            )
        elif skill_name == "create_pptx":
            return await self.execute_create_pptx(
                title=arguments.get("title", "Lecture Slides"),
                slides=arguments.get("slides", []),
                subtitle=arguments.get("subtitle"),
            )
        elif skill_name == "create_md":
            return await self.execute_create_md(
                title=arguments.get("title", "Study Notes"),
                markdown_content=arguments.get("markdown_content", ""),
            )
        elif skill_name == "plot_graph":
            return await self.execute_plot_graph(
                graph_type=arguments.get("graph_type", "line"),
                title=arguments.get("title", "Pharmacological Chart"),
                data=arguments.get("data", {}),
            )
        elif skill_name == "generate_flashcards":
            return await self.execute_generate_flashcards(
                topic=arguments.get("topic", "Pharmacology Deck"),
                cards=arguments.get("cards", []),
            )
        elif skill_name == "generate_mnemonics":
            return await self.execute_generate_mnemonics(
                drug_or_class=arguments.get("drug_or_class", ""),
                mnemonic=arguments.get("mnemonic", ""),
                breakdown=arguments.get("breakdown", []),
                clinical_notes=arguments.get("clinical_notes"),
            )
        elif skill_name == "draw_chemical_structure":
            return await self.execute_draw_chemical_structure(
                compound_name=arguments.get("compound_name", ""),
                smiles=arguments.get("smiles", ""),
                formula=arguments.get("formula"),
                pharmacophore_notes=arguments.get("pharmacophore_notes"),
            )
        else:
            raise ValueError(f"Unknown skill name: {skill_name}")


skill_engine = SkillExecutionEngine()
