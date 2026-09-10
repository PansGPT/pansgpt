# 📡 PansGPT 2.0 API Contracts

## Core Health Endpoints

- `GET /health/live`: Fast ping response (`{"status": "ok"}`). Used by cron-job.org keep-alive.
- `GET /health/ready`: Readiness probe verifying Supabase, R2, and Redis connectivity.

## Document Ingestion Pipeline

- `POST /api/v1/documents/upload-url`: Generates 15-minute presigned PUT URL to Cloudflare R2.
- `POST /api/v1/documents/process`: Triggers 8-stage ingestion pipeline (PyMuPDF -> Chunk -> Embed -> HNSW).
