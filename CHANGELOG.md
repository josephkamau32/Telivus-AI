# Changelog

All notable changes to Telivus-AI are documented here.
Format follows Keep a Changelog (https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- LLM evaluation pipeline with RAGAs
- Multi-language support (German / English)
- A/B testing framework for prompt variants

---

## [2.3.0] - 2026-07-04

### Added
- GitHub Actions CI pipeline (lint, type-check, test)
- Pre-commit hooks for secret detection and code quality
- CI and test badges in README
- Comprehensive pytest test suite with coverage reporting

### Changed
- Standardized on npm (removed bun lockfile)
- Pinned Python 3.11 for Vercel compatibility
- Reorganized markdown files into docs/ folder

### Fixed
- Removed AI session artifact files (INSTALLATION_STATUS.md, DEPLOY_NOW.md, etc.)
- Fixed SECURITY.md phone placeholder and LICENSE copyright

---

## [2.2.0] - 2026-07-03

### Added
- CSP/HSTS headers and request sanitization middleware
- Security hardening for production deployment

### Fixed
- Python version pinning for Vercel deployment
- Vercel deployment configuration

---

## [2.1.0] - 2026-06-30

### Added
- Comprehensive README rewrite with DSGVO compliance
- Architecture diagrams and recruiter-focused structure
- Production-grade documentation

### Changed
- Migrated to new Supabase project
- Upgraded Telivus-AI from prototype to production-grade

---

## [2.0.0] - 2026-01-23

### Added
- Digital Twin feature with enhanced app functionality
- Improved error handling and authentication fixes
- A+ improvements: testing, caching, auth, rate limiting, monitoring
- AI-powered health trajectory prediction and intervention simulation
- Comprehensive Alert Center with predictive notifications

### Changed
- Major architecture upgrade with advanced AI features
- Enhanced mobile responsiveness and service availability

---

## [1.2.0] - 2025-12-29

### Added
- A+ improvements: testing infrastructure, caching layer, authentication enhancements
- Rate limiting and monitoring capabilities
- Production readiness optimizations

### Fixed
- Mobile responsiveness issues
- Service unavailable issues
- Missing health trajectory button
- Removed tutorial dialog box

---

## [1.1.0] - 2025-11-28

### Added
- AI-powered health trajectory prediction and intervention simulation
- Comprehensive Alert Center with predictive notifications
- Complete AI engineering project with advanced features
- Real AI health assessment service using OpenAI GPT-4o-mini
- Production-ready fixes: CORS, AI service, error handling, startup script

### Changed
- Switched LLM provider from Gemini to OpenAI GPT-4o-mini
- Major CORS configuration fixes and cross-origin issue resolution
- Simplified requirements.txt for Render deployment (no Rust compilation)
- Fixed Python 3.13 compatibility with Pydantic v2.8.2
- Added missing pydantic-settings dependency

### Fixed
- CORS configuration and long loading times
- Edge function 500 errors
- Pydantic CORS validation error (removed invalid * wildcard)
- Render deployment issues (Python version, faiss-cpu version, entry point)
- faiss-cpu version compatibility (pinned to 1.9.0)

---

## [1.0.0] - 2025-10-07

### Added
- Initial release of Telivus AI health assessment platform
- RAG pipeline with LangChain and ChromaDB
- FastAPI backend with async endpoints
- React + TypeScript frontend with Vite
- Supabase integration for auth and data persistence
- Medical report generation with AI
- Google Sign-In authentication
- Dark/light mode and enhanced UI
- PDF report content and preview
- OTC medicine recommendations
- Health dashboard with medical report generation
- Chat interface with AI
- Landing page with live demo link
- Pitch deck and portfolio presentation
- Custom domain and favicon
- Docker deployment configuration

### Changed
- Refactored health report generation (multiple iterations)
- Updated Gemini AI model
- Fixed React Query Provider setup
- Enhanced security measures

### Fixed
- Health report generation errors
- CORS and Gemini integration issues
- Authentication errors
- Button clickability issues
- Medisense AI visibility and theme toggle

---

## [0.1.0] - 2025-09-24

### Added
- Initial project scaffold with Vite + React + TypeScript + Shadcn UI
- Supabase project connection
- Basic landing page structure
- Website structure and navigation