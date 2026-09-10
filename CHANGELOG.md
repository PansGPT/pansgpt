# Changelog

All notable changes to the PansGPT platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Monorepo scaffold with Turborepo and pnpm workspaces (`apps/web`, `apps/api`, `packages/*`).
- FastAPI backend framework with Pydantic v2 configuration and async PostgreSQL pool.
- 10 Supabase PostgreSQL migrations establishing 27 clean multi-tenant tables, 1536d pgvector HNSW indexes, RLS policies, and UNIJOS staging seed.
- Enhanced 8-stage document processing and hybrid RAG architecture specifications.
- Docker multi-stage build and Render deployment descriptors.
