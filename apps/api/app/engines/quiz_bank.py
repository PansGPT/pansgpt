"""Reuse code-validated academic questions within current tenant/source scope."""

from math import ceil
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from pydantic import ValidationError

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines.quiz_generation import duplicate
from app.engines.quiz_service import ELIGIBLE, database, unpack
from app.models.quiz import GeneratedQuestion, QuizConfig, QuizTaskConfig, Source


async def reusable_questions(
    config: QuizConfig, user: UserContext, quiz_id: UUID, avoid: list[str], limit: int
) -> list[tuple[GeneratedQuestion, list[Source]]]:
    if config.revision_result_id:
        return []
    async with database() as conn:
        rows = await conn.fetch(
            """SELECT * FROM (SELECT DISTINCT ON(p.prompt) p.* FROM public.quiz_questions p JOIN public.quizzes q ON q.id=p.quiz_id
        WHERE q.university_id=$1 AND q.level=$2::public.university_level AND q.course_code=$3
        AND q.difficulty=$4 AND q.question_format=$5 AND lower(q.topic)=lower($6)
        AND q.id!=$7 AND q.deleted_at IS NULL AND p.question_type=$5
        AND ($5!='statement_matrix' OR EXISTS(SELECT 1 FROM public.quiz_generation_jobs version
            WHERE version.quiz_id=q.id AND version.request_payload->>'matrix_generation_version'='1'))
        AND EXISTS(SELECT 1 FROM public.quiz_generation_jobs j WHERE j.quiz_id=q.id AND j.status IN ('completed','generating','saving','queued')
            AND j.request_payload->>'content_generation_version'='1')
        ORDER BY p.prompt,p.id DESC) p ORDER BY md5(p.id::text || $7::text) LIMIT 200""",
            user.university_id,
            user.current_level,
            config.course_code,
            config.difficulty,
            config.question_type,
            config.topic,
            quiz_id,
        )
        parsed = []
        for row in rows:
            try:
                sources = [Source.model_validate(value) for value in unpack(row["sources"])]
                item = GeneratedQuestion(
                    question_type=row["question_type"],
                    prompt=row["prompt"],
                    options=unpack(row["options"]),
                    answer_key=unpack(row["answer_key"]),
                    explanation=row["explanation"],
                    concept=row["concept"],
                    source_ids=[s.chunk_id for s in sources],
                )
                parsed.append((item, sources))
            except (ValidationError, TypeError, ValueError):
                continue
        ids = list({source.chunk_id for _, sources in parsed for source in sources})
        if not ids:
            return []
        evidence = await conn.fetch(
            f"""SELECT c.id,c.document_id,c.content,c.chunk_index,
        (SELECT count(*) FROM public.document_chunks all_chunks WHERE all_chunks.document_id=c.document_id) AS document_chunks
        FROM public.document_chunks c
        JOIN public.documents d ON d.id=c.document_id WHERE {ELIGIBLE} AND d.course_code=$3 AND c.id=ANY($4::uuid[])""",
            user.university_id,
            user.current_level,
            config.course_code,
            ids,
        )
    current = {row["id"]: row for row in evidence}
    accepted = []
    document_sizes = {row["document_id"]: row["document_chunks"] for row in evidence}
    region_limit = ceil(limit / max(1, min(4, sum(document_sizes.values()))))
    # Round-robin bank candidates by document section rather than using a run
    # of questions from one chunk. Missing sections can be generated normally.
    ranked = []
    seen_regions: dict[tuple[UUID, int], int] = {}
    for item, sources in parsed:
        first = current.get(sources[0].chunk_id)
        if first is None:
            continue
        region = (
            first["document_id"],
            min(7, first["chunk_index"] * 8 // max(1, first["document_chunks"])),
        )
        rank = seen_regions.get(region, 0)
        seen_regions[region] = rank + 1
        ranked.append((rank, region, item, sources))
    ranked.sort(key=lambda candidate: candidate[0])
    region_counts: dict[tuple[UUID, int], int] = {}
    for _, region, item, sources in ranked:
        if region_counts.get(region, 0) >= region_limit:
            continue
        if not all(
            s.chunk_id in current
            and current[s.chunk_id]["document_id"] == s.document_id
            and current[s.chunk_id]["content"].strip().startswith(s.excerpt.strip())
            for s in sources
        ):
            continue
        if duplicate(item.prompt, avoid + [q.prompt for q, _ in accepted]):
            continue
        accepted.append((item, sources))
        region_counts[region] = region_counts.get(region, 0) + 1
        if len(accepted) >= limit:
            break
    return accepted


async def schedule_inventory(config: QuizConfig, user: UserContext, document_id: UUID) -> bool:
    """Top up useful scoped inventory in small batches; never compete with user work."""
    if not settings.ENABLE_QUIZ_INVENTORY or config.revision_result_id:
        return False
    available = await reusable_questions(config, user, uuid4(), [], 30)
    if len(available) >= 30:
        return False
    key = uuid5(
        NAMESPACE_URL,
        ":".join(
            [
                "pansgpt-inventory",
                str(user.university_id),
                str(user.current_level),
                config.course_code,
                config.topic.casefold(),
                config.difficulty,
                config.question_type,
                "content-v1-matrix-v1"
                if config.question_type == "statement_matrix"
                else "content-v1",
                str(document_id),
                str(len(available)),
            ]
        ),
    )
    async with database() as conn, conn.transaction():
        if not await conn.fetchval(
            "SELECT pg_try_advisory_xact_lock(hashtextextended('pansgpt-quiz-refill',0))"
        ):
            return False
        if await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM public.quiz_generation_jobs WHERE user_id=$1 AND request_key=$2)",
            user.id,
            key,
        ):
            return False
        if await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM public.quiz_generation_jobs WHERE status IN ('queued','retrieving','generating','saving'))"
        ):
            return False
        document = await conn.fetchrow(
            f"SELECT d.id,d.course_title FROM public.documents d WHERE d.id=$4 AND {ELIGIBLE} AND d.course_code=$3",
            user.university_id,
            user.current_level,
            config.course_code,
            document_id,
        )
        if document is None:
            return False
        count = 10 if 30 - len(available) >= 10 else 5
        refill = QuizTaskConfig.model_validate(
            {**config.model_dump(), "bank_refill": True}
        ).model_copy(update={"count": count, "time_limit_sec": None})
        quiz_id = await conn.fetchval(
            """INSERT INTO public.quizzes(user_id,university_id,document_id,title,course_code,course_title,level,difficulty,num_questions,time_limit_sec,topic,question_format)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11) RETURNING id""",
            user.id,
            user.university_id,
            document_id,
            (config.topic or document["course_title"])[:200],
            config.course_code,
            document["course_title"],
            user.current_level,
            config.difficulty,
            count,
            config.topic,
            config.question_type,
        )
        await conn.execute(
            """INSERT INTO public.quiz_generation_jobs(user_id,university_id,quiz_id,request_payload,request_key,current_step)
        VALUES($1,$2,$3,$4::jsonb,$5,'Preparing fresh practice inventory')""",
            user.id,
            user.university_id,
            quiz_id,
            refill.model_dump_json(),
            key,
        )
        return True


async def schedule_refill(config: QuizConfig, user: UserContext, origin_id: UUID) -> None:
    async with database() as conn:
        document_id = await conn.fetchval(
            "SELECT document_id FROM public.quizzes WHERE id=$1 AND user_id=$2 AND university_id=$3 AND deleted_at IS NULL",
            origin_id,
            user.id,
            user.university_id,
        )
    if document_id:
        await schedule_inventory(config, user, document_id)
