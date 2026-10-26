# ==============================================================================
# PansGPT 2.0 FastAPI Production Multi-Stage Dockerfile (Phase 3 Spec)
# ==============================================================================

# Stage 1: Build Dependencies
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends     build-essential     curl     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Package the small public reranker once, rather than downloading it during
# free-tier cold starts. Ranker validates the ONNX file as part of initialization.
RUN python -c "from flashrank import Ranker; Ranker(model_name='ms-marco-TinyBERT-L-2-v2', cache_dir='/opt/pansgpt/flashrank')" \
    && chmod -R a=rX /opt/pansgpt/flashrank

# Stage 2: Runtime Minimal Container
FROM python:3.12-slim AS runner

WORKDIR /app

# Install LibreOffice runtime and fonts for Office to PDF conversion  # [OFFICE PDF FIX]
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-impress \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*  # [OFFICE PDF FIX]

# Create non-root secure user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

# [CHAT FIX 2] Keep Python's user site under appuser's configured home (/app).
COPY --from=builder /root/.local /app/.local
ENV PATH=/app/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV RERANKER_CACHE_DIR=/opt/pansgpt/flashrank
COPY --from=builder /opt/pansgpt/flashrank /opt/pansgpt/flashrank

# Copy application source code and background worker tasks
COPY --chown=appuser:appgroup app/ ./app/
COPY --chown=appuser:appgroup workers/ ./workers/
COPY --chown=appuser:appgroup pyproject.toml .

USER appuser

EXPOSE 8000

# [CHAT FIX 2] Python is present in the runtime image; builder-only curl is not.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live', timeout=4)"]

# One async API process fits the free pilot; each extra process duplicates the
# model and database pool. ARQ workers remain separate operator-managed services.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
