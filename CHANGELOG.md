# Changelog

All notable changes to Telivus AI are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- LSTM + Transformer health trajectory prediction pipeline
- RAGAs-based RAG evaluation and benchmarking
- Multi-language support (German / English / Swahili)
- GDPR-compliant data deletion endpoint

---

## [1.2.0] — 2026-07

### Added
- **"Try Demo" button** on Auth page for instant portfolio review access
- **EU AI Act compliance documentation** (`docs/eu-ai-act-compliance.md`)
- **Impact & Demo Metrics** section in README with concrete performance numbers
- **German market readiness** section with DSGVO/on-prem deployment notes
- **Troubleshooting & FAQ** moved to dedicated `docs/troubleshooting.md`

### Changed
- **README.md restructured** for 10-second recruiter scan: hero section, metrics, optimized flow
- **Backend status UX**: "Limited AI features" warning replaced with friendly "Waking up backend server…" spinner for Render free-tier cold starts
- **API client**: Health check timeout increased from 5s → 20s with 3-retry exponential backoff
- **SECURITY.md**: Complete rewrite — removed legacy Supabase references, aligned with current FastAPI + JWT architecture
- **`.env.example`**: Cleaned legacy configs (Supabase, Flutterwave, Stripe), reorganized into logical groups
- **`package.json`**: Renamed from `vite_react_shadcn_ts` → `telivus-ai`, version bumped to `1.2.0`
- **`docker-compose.yml`**: Removed deprecated `version: '3.8'` key
- Fixed `process.env.NODE_ENV` → `import.meta.env.MODE` throughout frontend (Vite compatibility)

### Removed
- Legacy Supabase architecture section from README (preserved in `supabase/LEGACY.md`)
- Unused Supabase/Flutterwave/Stripe environment variables from `.env.example`

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