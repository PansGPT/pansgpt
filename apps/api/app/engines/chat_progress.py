"""Public workflow updates, never a model's private planning or scratchpad."""

import json

from app.models.progress import PublicProgressLabel, PublicProgressUpdate, validate_public_label

PROGRESS_LABELS: dict[str, str] = {
    "reviewing_request": "Reviewing your request.",
    "checking_materials": "Checking your course materials.",
    "searching_sources": "Checking external sources.",
    "reading_document": "Reading the selected document.",
    "analysing_image": "Analysing the attached image.",
    "creating_materials": "Preparing your study materials.",
    "using_tool": "Running a study tool.",
    "writing_response": "Preparing your response.",
    "planning_presentation": "Planning your presentation.",
    "creating_presentation": "Designing and validating your slides.",
    "presentation_ready": "Presentation ready to preview.",
}


def public_progress_text(text: str | None) -> str:
    allowed = set(PROGRESS_LABELS.values())
    return "\n".join(
        dict.fromkeys(line.strip() for line in (text or "").splitlines() if line.strip() in allowed)
    )


class ChatProgress:
    def __init__(self) -> None:
        self.codes: list[str] = []
        self.labels: dict[str, str] = {}
        self.updates: list[PublicProgressUpdate] = []

    def configure(self, labels: list[PublicProgressLabel]) -> None:
        self.labels = {item.code: item.label for item in labels}

    @property
    def text(self) -> str:
        return "\n".join(PROGRESS_LABELS[code] for code in self.codes)

    def emit(self, code: str, model_label: str | None = None) -> str | None:
        if code not in PROGRESS_LABELS:
            return None
        frames: list[str] = []
        if code not in self.codes:
            self.codes.append(code)
            label = PROGRESS_LABELS[code] + "\n"
            frames.append(
                f"event: thinking_chunk\ndata: {json.dumps({'code': code, 'token': label, 'delta': label})}\n\n"
            )
        candidate = model_label or self.labels.get(code)
        if candidate and len(self.updates) < 24:
            try:
                update = PublicProgressUpdate(code=code, label=validate_public_label(candidate))
            except ValueError:
                update = None
            if update and update not in self.updates:
                self.updates.append(update)
                frames.append(f"event: public_progress\ndata: {update.model_dump_json()}\n\n")
        return "".join(frames) or None

    def for_tool(self, name: str, model_label: str | None = None) -> str | None:
        code = {
            "create_pptx": "creating_presentation",
            "web_search": "searching_sources",
            "search_course_materials": "checking_materials",
            "course_search": "checking_materials",
            "read_document": "reading_document",
            "analyze_image": "analysing_image",
            "analyse_image": "analysing_image",
        }.get(name, "creating_materials" if name.startswith("create_") else "using_tool")
        return self.emit(code, model_label)
