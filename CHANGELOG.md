# Changelog

All notable changes to Telivus AI are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- LSTM + Transformer health trajectory prediction pipeline
- RAGAs-based RAG evaluation and benchmarking
- Langfuse LLM observability integration
- Multi-language support (German / English / Swahili)
- GDPR-compliant data deletion endpoint

---

## [1.1.0] — 2026-06

### Added
- Comprehensive pytest test suite with coverage reporting
- GitHub Actions CI pipeline (lint, type-check, tests)
- Pre-commit hooks for secret detection and code quality
- `SECURITY.md` with responsible disclosure policy
- `.env.example` with all environment variables documented
- Docker Compose configuration for local and production deployment
- Advanced Predictive Alerts Center with multi-channel notification support
- `docs/` folder for technical documentation

### Changed
- Migrated primary backend from Supabase Edge Functions to FastAPI + Python
- Switched LLM provider from Gemini API to OpenAI GPT-4o-mini
- Moved reference documentation from root into `docs/` folder

### Fixed
- Removed binary files (`supabase.exe`, `supabase.tar.gz`) from repository
- Removed AI session artifact files from public repo
- Fixed placeholder text in README (`your-username` references)
- Removed duplicate Contributing, License, and Support sections from README

---

## [1.0.0] — 2025

### Added
- Initial release of Telivus AI health assessment platform
- RAG pipeline using LangChain agents and ChromaDB vector store
- FastAPI backend with async endpoints and OpenAPI documentation
- React 18 + TypeScript + Vite frontend with Shadcn/ui components
- Supabase integration for authentication and data persistence
- Docker deployment configuration
- Live deployments: frontend on Vercel (telivus.co.ke), backend on Render
- Screenshots folder with UI documentation
- Medical disclaimer and safety notices