# ==============================================================================
# ARQ Background Tasks for Document Ingestion (Phase 5)
# ==============================================================================

import structlog

from app.engines.ingestion import document_ingestion_engine

logger = structlog.get_logger(__name__)


async def ingest_document_job(ctx: dict, document_id: str, storage_key: str) -> bool:
    """
    ARQ Background Job: Claims the document, downloads PDF from R2, runs the 8-stage
    extraction and chunking pipeline, and stores 3072d vectors in PostgreSQL.
    """
    logger.info("worker_starting_ingest_job", document_id=document_id, key=storage_key)
    try:
        success = await document_ingestion_engine.ingest_document_from_r2(
            document_id=document_id,
            storage_key=storage_key,
        )
        logger.info("worker_completed_ingest_job", document_id=document_id, success=success)
        return success
    except Exception as exc:
        logger.error("worker_failed_ingest_job", document_id=document_id, error=str(exc))
        raise exc
