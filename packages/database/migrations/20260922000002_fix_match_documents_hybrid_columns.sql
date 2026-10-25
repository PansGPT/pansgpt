-- ==============================================================================
-- Migration: 20260922000002_fix_match_documents_hybrid_columns.sql
-- Description: Fix missing column references on document_chunks in match_documents_hybrid
-- document_chunks table does not have content_type, bounding_box, or section_id.
-- Replace with valid aliases: 'text'::text, NULL::jsonb, and NULL::uuid.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.match_documents_hybrid(
    query_text text,
    query_embedding vector(3072),
    match_threshold double precision DEFAULT 0.25,
    match_count integer DEFAULT 10,
    filter_university_id uuid DEFAULT NULL,
    filter_levels public.university_level[] DEFAULT NULL,
    filter_doc_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    chunk_index integer,
    content text,
    content_type text,
    page_start integer,
    page_end integer,
    bounding_box jsonb,
    section_id uuid,
    segment_id uuid,
    dense_score double precision,
    fts_score double precision,
    trgm_score double precision,
    rrf_score double precision
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    k CONSTANT double precision := 60.0;
BEGIN
    RETURN QUERY
    WITH
    candidate_docs AS (
        SELECT d.id
        FROM public.documents d
        WHERE d.deleted_at IS NULL
          AND d.status = 'active'
          AND (filter_university_id IS NULL OR d.university_id = filter_university_id)
          AND (filter_doc_ids IS NULL OR d.id = ANY(filter_doc_ids))
    ),
    vector_pool AS (
        SELECT
            c.id,
            1.0 - (c.embedding <=> query_embedding) AS score,
            ROW_NUMBER() OVER (ORDER BY (c.embedding <=> query_embedding) ASC) AS rank
        FROM public.document_chunks c
        JOIN candidate_docs cd ON cd.id = c.document_id
        WHERE c.embedding IS NOT NULL
          AND (1.0 - (c.embedding <=> query_embedding)) >= match_threshold
        ORDER BY c.embedding <=> query_embedding ASC
        LIMIT 40
    ),
    fts_pool AS (
        SELECT
            c.id,
            ts_rank_cd(c.content_fts, plainto_tsquery('english', query_text))::double precision AS score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.content_fts, plainto_tsquery('english', query_text)) DESC) AS rank
        FROM public.document_chunks c
        JOIN candidate_docs cd ON cd.id = c.document_id
        WHERE c.content_fts @@ plainto_tsquery('english', query_text)
        ORDER BY score DESC
        LIMIT 40
    ),
    trgm_pool AS (
        SELECT
            c.id,
            word_similarity(query_text, c.content)::double precision AS score,
            ROW_NUMBER() OVER (ORDER BY word_similarity(query_text, c.content) DESC) AS rank
        FROM public.document_chunks c
        JOIN candidate_docs cd ON cd.id = c.document_id
        WHERE word_similarity(query_text, c.content) >= 0.20
        ORDER BY score DESC
        LIMIT 40
    ),
    combined_ids AS (
        SELECT id FROM vector_pool
        UNION
        SELECT id FROM fts_pool
        UNION
        SELECT id FROM trgm_pool
    ),
    ranked_chunks AS (
        SELECT
            cid.id,
            COALESCE(vp.score, 0.0) AS dense_score,
            COALESCE(fp.score, 0.0) AS fts_score,
            COALESCE(tp.score, 0.0) AS trgm_score,
            (
                COALESCE(1.0 / (k + vp.rank), 0.0) +
                COALESCE(1.0 / (k + fp.rank), 0.0) +
                COALESCE(1.0 / (k + tp.rank), 0.0)
            ) AS rrf_score
        FROM combined_ids cid
        LEFT JOIN vector_pool vp ON vp.id = cid.id
        LEFT JOIN fts_pool fp ON fp.id = cid.id
        LEFT JOIN trgm_pool tp ON tp.id = cid.id
    )
    SELECT
        c.id AS chunk_id,
        c.document_id,
        c.chunk_index,
        c.content,
        'text'::text AS content_type,
        c.page_start,
        c.page_end,
        NULL::jsonb AS bounding_box,
        NULL::uuid AS section_id,
        c.segment_id,
        rc.dense_score,
        rc.fts_score,
        rc.trgm_score,
        rc.rrf_score
    FROM ranked_chunks rc
    JOIN public.document_chunks c ON c.id = rc.id
    ORDER BY rc.rrf_score DESC
    LIMIT match_count;
END;
$$;
