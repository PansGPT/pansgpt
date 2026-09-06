# 🌿 PansGPT 2.0

> **Intelligent Pharmacy Education Platform**  
> Engine-First Greenfield Rebuild | Strictly \$0 Architecture | Turborepo Monorepo

[![CI Pipeline](https://github.com/PansGPT/pansgpt/actions/workflows/ci.yml/badge.svg)](https://github.com/PansGPT/pansgpt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🏛️ Architecture Overview

PansGPT 2.0 is built under an **Engine-First** methodology: all core backend engines (Database, Document Ingestion, RAG, and AI Streaming) are built and validated via automated pytest API contracts before UI layers are attached.

```
pansgpt/
├── apps/
│   ├── web/        ← Next.js 15 App Router, React 19, Tailwind v4
│   ├── mobile/     ← Expo SDK 52+, React Native New Architecture
│   ├── desktop/    ← Electron 33, local SQLite, offline-first
│   └── api/        ← FastAPI, Python 3.11+, Pydantic v2, ARQ
└── packages/
    ├── database/   ← Supabase PostgreSQL migrations, RLS, seed data
    ├── ui/         ← Design system primitives, OKLCH theme tokens
    ├── types/      ← Shared TypeScript interfaces & API contracts
    ├── eslint-config/
    └── typescript-config/
```

### Core Tech Stack Matrix

| Layer | Technology | Cost / Strategy |
| :--- | :--- | :--- |
| **Monorepo** | Turborepo + pnpm workspaces | Zero build overhead, remote caching |
| **API Engine** | FastAPI (Python 3.11+) + Pydantic v2 | Render Free Web Service ($0) |
| **Web Frontend** | Next.js 15, React 19, Tailwind CSS v4 | Vercel Hobby ($0) |
| **Mobile App** | Expo SDK 52+, React Native | EAS Free Tier ($0) |
| **Desktop App**| Electron 33, better-sqlite3 | GitHub Releases packaging ($0) |
| **Database** | Supabase PostgreSQL + pgvector | Free Tier ($0) with UUIDv7 + HNSW |
| **Document Store** | Cloudflare R2 (S3-compatible) | 10 GB free ($0 egress fees) |
| **AI Primary** | Gemma 4 via Google AI Studio | $0 Free Tier |
| **AI Fallback**| LLaMA 3.3 70B via Groq | $0 Free Tier (sub-second TTFT) |
| **Background Jobs** | ARQ + Upstash Serverless Redis | 10,000 cmds/day free ($0) |
| **Email** | Resend + React Email | 3,000 free emails/mo ($0) |

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Node.js**: `v20.0.0+`
- **pnpm**: `v9.0.0+` (`npm install -g pnpm`)
- **Python**: `3.11+`
- **Docker Desktop**: Required for local Supabase Docker stack

### 2. Monorepo Setup
```bash
# Clone the repository
git clone https://github.com/PansGPT/pansgpt.git
cd pansgpt

# Install JavaScript/TypeScript dependencies
pnpm install

# Setup Python virtual environment for apps/api
cd apps/api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 3. Environment Variables
```bash
cp .env.example .env
```

### 4. Running Services
```bash
# Start all services concurrently via Turborepo
pnpm dev

# Or run specific targets:
pnpm dev --filter=@pansgpt/web    # Next.js at http://localhost:3000
pnpm dev --filter=@pansgpt/api    # FastAPI at http://localhost:8000
```

---

## 🧪 Testing Strategy
- **API Tests**: `pytest apps/api/tests`
- **Type Checking**: `pnpm typecheck`
- **Linting**: `pnpm lint`

---

## 📜 License
MIT License. Copyright (c) 2026 PansGPT Team.
