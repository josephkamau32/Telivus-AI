# Telivus AI Comprehensive Engineering Audit

**Audit date:** 2026-08-19  
**Scope:** React/Vite frontend, FastAPI backend, Supabase Edge Functions and migrations, AI/RAG/CCEE services, payments, Docker/CI, tests, SEO, accessibility, privacy, and Germany/EU readiness.  
**Method:** Read-only source review, targeted dependency/configuration inspection, repository-wide searches, and local validation. No application code was intentionally modified.

## Executive Verdict

Telivus AI is a strong portfolio concept with unusually broad surface area: health assessment, conversational AI, RAG, explainability, digital-twin experimentation, payments, Supabase, and observability. It currently demonstrates ambition more convincingly than production safety. The central architectural weakness is identity fragmentation: Supabase Auth protects parts of the frontend, while the FastAPI service has a separate incomplete JWT implementation, and several service-role Edge Functions trust caller-supplied identifiers.

**Current maturity estimate:** promising research/demo prototype, not healthcare production-ready.  
**Before public healthcare use:** remediate all Critical and High findings, establish one identity boundary, complete abuse testing, and obtain clinical/privacy/regulatory review.  
**Portfolio value:** high after the remediation work is documented with threat models, reproducible evaluation, security tests, and honest product positioning.

## Validation Snapshot

| Check | Result | Interpretation |
|---|---|---|
| `npm run build` | Passed | Production bundle builds successfully. |
| `npm run test:run` | 32 passed, 1 skipped | Useful unit/component baseline; live health-report E2E is skipped. |
| `npm run lint` | 0 errors, 111 warnings | CI passes today, but type quality and React hook correctness need attention. |
| `npm audit --audit-level=high` | Failed: 18 vulnerabilities, including 2 critical | Dependency remediation is required; do not blindly use `--force`. |
| `python -m pytest -q` in `backend` | Collection failed | Active environment has incompatible FastAPI/Starlette behavior: `Router.__init__()` rejects `on_startup`. |
| Backend dependency reproducibility | Not established | The repository pins FastAPI 0.104.1, while the active interpreter imported a newer incompatible stack. |
| Supabase Edge Function tests | Not found | Authorization, payment, RLS, and cache behavior lack executable regression coverage. |

The test run also generated changes to tracked Python bytecode caches in the working tree. Review those separately before committing; they are not part of this report.

## Severity Model

- **Critical:** practical unauthorized access, payment bypass, health-data disclosure, arbitrary code/file impact, or a credible path to serious patient harm.
- **High:** significant confidentiality, integrity, availability, financial, safety, or compliance exposure.
- **Medium:** material correctness, operational, maintainability, or abuse risk.
- **Low:** defense-in-depth, documentation, polish, or future-readiness issue.

## Critical Findings

### C-01: Digital-twin endpoints have no authentication or ownership boundary

**Evidence:** [digital_twin.py](backend/app/api/v1/endpoints/digital_twin.py#L137-L186) defaults every request to `user_id="demo_user"`; [useDigitalTwin.ts](src/integrations/supabase/hooks/useDigitalTwin.ts#L84-L105) sends no bearer token.

**Impact:** callers can read, update, create, and append health events to the shared demo identity. If the database is available, one user can affect another user’s longitudinal health model; if unavailable, the API returns misleading shared mock data. This is an IDOR and cross-tenant data-integrity defect.

**Remediation:** remove caller-controlled/default user IDs; require a verified Supabase JWT, derive `sub` server-side, enforce ownership in every service query, and return `401`/`403` instead of demo data in production. Add cross-user integration tests for every twin route.

### C-02: `chat-with-ai` trusts arbitrary `sessionId` while using service-role access

**Evidence:** the function authenticates a token but never checks that `sessionId` belongs to `user.id` before reading or writing messages: [chat-with-ai/index.ts](supabase/functions/chat-with-ai/index.ts#L39-L120).

**Impact:** a user who learns another session UUID can read its history into an OpenAI prompt, inject context, and append assistant messages. The service-role client bypasses RLS, so the corrected client-side migration does not protect this function path.

**Remediation:** query `chat_sessions` with both `id = sessionId` and `user_id = user.id`; fail closed on no row. Use a user-scoped client where possible. Validate message length/content, constrain roles server-side, check every insert/update error, and add a test proving user A cannot access user B’s session.

### C-03: `generate-medical-report` lacks caller authentication and accepts arbitrary `userId`

**Evidence:** [generate-medical-report/index.ts](supabase/functions/generate-medical-report/index.ts#L92-L137) parses `userId` from JSON, permits null, and writes with the service-role key without verifying the Authorization header.

**Impact:** unauthenticated callers may spend OpenAI budget and create health records/log entries attributed to another user. This undermines auditability, consent, retention, and data-subject rights.

**Remediation:** require and verify the Supabase access token; derive the user ID from the token; ignore or reject a body `userId`; apply an explicit anonymous/demo policy if anonymous assessments are a product requirement. Put public traffic behind a separate quota-limited endpoint that never writes identifiable health data.

### C-04: Medical-report cache mixes clinically different patient contexts

**Evidence:** the cache key includes symptoms, feelings, and coarse age only: [generate-medical-report/index.ts](supabase/functions/generate-medical-report/index.ts#L22-L62). History, surgery, medications, allergies, gender, and name are excluded.

**Impact:** a report generated for one patient can be returned for another patient with different medications, allergies, contraindications, or risk factors. The later field overlay does not repair the generated assessment or OTC advice.

**Remediation:** disable caching for personalized clinical output, or key by an authenticated user plus a canonical hash of every clinically relevant input and model/knowledge-base version. Never cache medication recommendations across users. Add adversarial cache-isolation tests.

### C-05: Public FastAPI health routes can trigger expensive AI work

**Evidence:** `/api/v1/health/assess` has no auth dependency: [health.py](backend/app/api/v1/endpoints/health.py#L25-L75). The rate-limiter module exists, but route installation/application is not demonstrated: [rate_limiter.py](backend/app/middleware/rate_limiter.py#L37-L70).

**Impact:** unauthenticated callers can consume provider quota, exhaust worker capacity, and cause denial of service. The same concern applies to suggestions and emergency-check routes.

**Remediation:** decide which routes are public; require authentication for personalized reports; enforce rate limits at the edge and application layers; add body/token/response-size limits, concurrency limits, provider budgets, timeouts, circuit breakers, and per-user cost accounting. Test 429 behavior under concurrent load.

## High Findings

### H-01: FastAPI auth is separate from Supabase Auth and is not production authentication

The backend defines custom JWTs while the frontend uses Supabase sessions. Registration/login state is not backed by the database, `get_current_active_user` only trusts token claims, and route protection is inconsistent: [auth.py](backend/app/core/auth.py#L200-L260). This creates two incompatible identity systems and makes ownership proofs unreliable.

**Fix:** choose Supabase Auth as the sole identity provider, verify its JWTs through a well-defined JWKS/issuer/audience configuration, map `sub` to tenant/user records, and delete or isolate the unused custom auth implementation. Add expiry, issuer, audience, algorithm-confusion, revocation/session, and role tests.

### H-02: Default JWT secret can survive a production misconfiguration

`SECRET_KEY` defaults to a known string and the validation check reads `DEBUG` independently with a development default of `True`: [auth.py](backend/app/core/auth.py#L24-L35), [config.py](backend/app/core/config.py#L15-L30). A deployment that omits `DEBUG` can start with a publicly known signing key.

**Fix:** require `SECRET_KEY` in production with no fallback; default `DEBUG=False`; validate environment at startup; use a secret manager; rotate keys with `kid` support and a controlled overlap window.

### H-03: Payment verification is not bound to the authenticated user

`verify-payment` looks up a subscription globally by payment reference and updates it without checking `subscription.user_id === user.id`: [verify-payment/index.ts](supabase/functions/verify-payment/index.ts#L43-L120).

**Fix:** bind Paystack metadata, transaction email, payment reference, and subscription row to the current user; reject mismatch; make verification idempotent; enforce a unique reference; use a webhook as the authoritative event where appropriate; perform activation/expiration atomically and check all database errors.

### H-04: Payment state transitions are race-prone and not transactional

Activation expires other subscriptions and updates the selected subscription in separate calls. Chat decrements `chats_remaining` using a read-then-write sequence: [chat-with-ai/index.ts](supabase/functions/chat-with-ai/index.ts#L56-L90), [verify-payment/index.ts](supabase/functions/verify-payment/index.ts#L90-L115).

**Impact:** concurrent requests can consume one chat multiple times, activate multiple plans, or leave partially updated state.

**Fix:** use database transactions or atomic RPCs with row locks/conditional updates, unique partial indexes for one active subscription, idempotency keys, and property-based/concurrency tests.

### H-05: Sensitive health data is logged and stored more broadly than the documentation claims

The medical-report function logs request fields and raw validation payloads, persists reports and report logs, and logs OpenAI key length/prefix: [generate-medical-report/index.ts](supabase/functions/generate-medical-report/index.ts#L101-L178). The frontend also logs report/user/session data: [Index.tsx](src/pages/Index.tsx#L1000-L1048), [ChatInterface.tsx](src/components/ChatInterface.tsx#L80-L100).

**Fix:** adopt structured redacted logging; prohibit raw symptoms, histories, identifiers, tokens, and provider-key metadata in logs; use Sentry `beforeSend` scrubbing; classify fields; define retention and deletion jobs; encrypt sensitive data at rest and in backups; document the real data lifecycle.

### H-06: Edge-function CORS is permissive or origin-reflecting

Chat and payment functions allow `*`; report generation reflects the request Origin: [chat-with-ai/index.ts](supabase/functions/chat-with-ai/index.ts#L5-L8), [initialize-payment/index.ts](supabase/functions/initialize-payment/index.ts#L5-L8), [generate-medical-report/index.ts](supabase/functions/generate-medical-report/index.ts#L4-L16).

**Fix:** maintain a production allowlist, reject unknown origins, handle preflight consistently, and do not treat CORS as authorization. Add tests for allowed, disallowed, missing, and malicious origins.

### H-07: AI fallback can silently produce demo medical advice

The backend falls back between AI, advanced, and simple/mock services on import failure: [health_assessment.py](backend/app/services/health_assessment.py#L17-L62). The frontend also creates instant local demo reports: [Index.tsx](src/pages/Index.tsx#L1000-L1025).

**Impact:** an operational failure can look like a valid clinical response. A user may not realize that the output was generated by a demo path rather than the evaluated model.

**Fix:** make fallback explicit, environment-gated, and impossible in production unless a signed feature flag permits it; include provenance/model/status in responses; fail closed for medical workflows; expose a visible degraded-service state.

### H-08: AI safety and confidence claims are not sufficiently grounded

The service overwrites confidence with `0.85` for AI reports: [health_assessment.py](backend/app/services/health_assessment.py#L85-L104). Prompts request diagnoses, differentials, and OTC medication instructions without a deterministic clinical safety policy: [generate-medical-report/index.ts](supabase/functions/generate-medical-report/index.ts#L184-L235).

**Fix:** calibrate confidence on held-out, representative data; report uncertainty rather than pseudo-precision; implement deterministic emergency/red-flag rules before generation; validate structured output against an allowlist; block unsafe medication advice; require clinician review for high-risk classes; version prompts, models, knowledge, and policies.

### H-09: Docker runtime and Compose defaults are unsafe or unreliable

Compose ships `changeme` database credentials, an `admin` Grafana default, host-exposed Postgres/Redis/Prometheus/Grafana, and `latest` monitoring images: [docker-compose.yml](docker-compose.yml#L8-L24), [docker-compose.yml](docker-compose.yml#L70-L94). The backend health check uses Python `requests` and Compose uses `curl`, but runtime availability is not guaranteed: [Dockerfile](backend/Dockerfile#L40-L48).

**Fix:** remove production defaults, keep infrastructure private, use secrets, pin image digests, add a read-only filesystem/capabilities policy, verify health checks in CI, and separate development Compose from production deployment.

### H-10: Dependency security is currently failing

`npm audit --audit-level=high` reported 18 vulnerabilities, including critical advisories affecting `jspdf` and `vitest`, plus high advisories in React Router, Vite/Rollup, PostCSS, DOMPurify, and transitive packages. Remediate with reviewed upgrades and lockfile changes; do not apply `npm audit fix --force` without compatibility testing. Add `pip-audit`, SBOM generation, Dependabot/Renovate, image scanning, and a documented exception process.

## Medium Findings

### M-01: Documented API surface is not mounted consistently

The API aggregator lists multiple routers, but `main.py` visibly mounts only health and digital-twin routers: [main.py](backend/app/main.py#L21-L22), [api.py](backend/app/api/v1/api.py#L1-L40). Reports, voice, and image endpoints are placeholders: [reports.py](backend/app/api/v1/endpoints/reports.py#L1-L40). Update documentation to match reality or complete the routes with tests.

### M-02: Database initialization is a placeholder

`create_tables()` is empty: [main.py](backend/app/main.py#L41-L43). Production schema ownership is unclear between SQLAlchemy, Alembic, and Supabase migrations. Establish one migration authority, run migrations as a deployment step, and make startup read-only.

### M-03: Request “sanitization” is not a substitute for validation or prompt defense

The middleware mutates private Starlette request internals and only logs SQL/command injection patterns: [main.py](backend/app/main.py#L175-L230). Regex detection can create false positives and misses semantic prompt injection. Use Pydantic constraints, parameterized queries, output encoding, size limits, and explicit prompt/data separation.

### M-04: Backend security headers are too permissive in key directives

The CSP allows `unsafe-inline`, `unsafe-eval`, broad HTTPS images, and third-party script hosts: [main.py](backend/app/main.py#L125-L155). `X-XSS-Protection` is obsolete and should not be presented as a primary control. Move to nonce/hash-based CSP, remove unnecessary sources, add `frame-src`/`worker-src` deliberately, and configure headers at the actual frontend origin.

### M-05: Error handling leaks internal details in some paths

Digital-twin update errors include `str(e)` in a response: [digital_twin.py](backend/app/api/v1/endpoints/digital_twin.py#L250-L272). Standardize opaque client errors, correlation IDs, redacted server logs, and typed error envelopes.

### M-06: Tests accept failures and skip the important boundary

The health integration test accepts either `200` or `500`: [test_api_endpoints.py](backend/tests/integration/test_api_endpoints.py#L42-L58). The health-report test is schema-only and skips the live call: [health-report.test.ts](tests/health-report.test.ts#L68-L85). Replace permissive assertions with deterministic provider mocks, contract tests, disposable database tests, and negative authorization cases.

### M-07: Frontend type and hook quality needs a cleanup pass

Lint reports 111 warnings, many `any` usages and missing React hook dependencies. These can hide stale closures, incorrect user/session state, and runtime shape mismatches. Define shared API schemas, generate types from contracts, enable stricter TypeScript options, and make warnings fail for security-sensitive packages.

### M-08: FastAPI and Python dependency reproducibility is weak

The repository pins some packages but uses ranges such as `openai>=1.0.0` and `langfuse<2.0`; the active environment disagreed with the pinned FastAPI behavior. Use a lock-producing tool, separate runtime/test/evaluation requirements, add `pip check`, and test from a clean Python 3.11 container.

### M-09: Resource controls are incomplete

AI inputs, symptoms, histories, arrays, and output sizes need explicit limits. Add request timeouts, cancellation propagation, queue limits, per-tenant budgets, provider retry classification, circuit breakers, and maximum token/cost policies.

### M-10: Observability needs privacy-aware SLOs

Define latency, error, AI refusal, safety escalation, provider cost, cache isolation, and queue saturation metrics. Use trace IDs without health payloads, restrict dashboard access, set retention, and create alerts that do not expose patient data.

## RLS and Supabase Review

The repository shows meaningful remediation history for public policies and client-side report/message inserts: [20260815122500_fix_rls_public_policies.sql](supabase/migrations/20260815122500_fix_rls_public_policies.sql#L1-L30), [20260815124600_fix_chat_messages_session_ownership.sql](supabase/migrations/20260815124600_fix_chat_messages_session_ownership.sql#L1-L35). That is good evidence of security thinking, but RLS does not protect service-role code. For every table, test `anon`, `authenticated`, and `service_role` separately, including SELECT/INSERT/UPDATE/DELETE and foreign-key parent ownership.

Specific follow-up checks:

1. Confirm all service-role policies include `TO service_role` and are not accidentally public.
2. Add parent ownership checks for every child table, not just `chat_messages`.
3. Decide intentionally whether `health_reports` should have no client SELECT policy.
4. Add immutable audit events for payment and report state transitions.
5. Add constraints for role/status/plan values, non-negative amounts, unique payment references, and valid timestamps.
6. Test migration ordering from an empty database and from a production-like snapshot.

## AI/ML and RAG Improvement Plan

### Evaluation

- Maintain versioned datasets with symptom diversity, age groups, sex/gender considerations, language, health literacy, and emergency cases.
- Track factuality, groundedness, citation coverage, calibration error, refusal quality, red-flag recall, unsafe-advice rate, latency, and cost.
- Report confidence intervals and subgroup performance, not one aggregate RAGAS number.
- Add golden tests for prompt injection, conflicting sources, missing context, medication contraindications, and malformed model JSON.

### RAG

- Version the medical corpus, source URL, publisher, jurisdiction, publication date, review date, and evidence grade.
- Add ingestion validation, duplicate detection, stale-source alerts, chunk provenance, and retrieval evaluation.
- Do not allow retrieved text to override system safety policy; treat documents as untrusted data.
- Return citations and “insufficient evidence” states; do not fabricate certainty when retrieval is empty.

### Clinical safety

- Put deterministic emergency triage before the LLM.
- Use a strict output schema and reject/repair invalid output through a bounded path.
- Maintain a contraindication/interaction policy for any medication content.
- Separate education, triage, and diagnosis-like workflows in product language and API contracts.
- Create a clinician review board and incident process before making efficacy claims.

### ML digital twin

- Document the target variable, cohort, labels, missingness, leakage controls, calibration, and baseline model.
- Prove that forecasts improve decisions rather than merely produce plausible charts.
- Add drift detection, retraining criteria, subgroup fairness analysis, and a delete/rebuild mechanism for a user’s data.
- Never use a shared default identity or mock response in a production learning path.

## Privacy, Security, and Germany/EU Readiness

This report is not legal advice. Health data is special-category personal data under GDPR. A credible Germany-facing project should include:

1. A data inventory and records of processing: inputs, outputs, logs, cache, backups, analytics, support, and provider transfers.
2. Purpose limitation, lawful basis, explicit consent where applicable, withdrawal, retention periods, deletion, export, correction, and objection workflows.
3. Data-processing agreements and transfer assessment for OpenAI, Supabase, Paystack, Sentry, Langfuse, hosting, and email providers.
4. Data minimization and a documented decision on whether identifiable data is sent to each processor.
5. DPIA for health profiling/AI; threat model using STRIDE plus LINDDUN privacy analysis.
6. EU AI Act classification assessment, human oversight, logging, transparency, risk management, technical documentation, and post-market monitoring where applicable.
7. Medical-device boundary assessment under MDR. Do not imply diagnosis, treatment, or CE readiness without formal assessment.
8. German UX: German translation reviewed by a native speaker, emergency numbers and escalation wording appropriate to Germany, European date/time conventions, accessible consent text, and a visible privacy contact/DPO path.
9. Security incident response, breach notification workflow, vulnerability disclosure, backup restoration tests, and business continuity targets.

## SEO, Accessibility, and Product Discoverability

### Confirmed SEO gaps

- The SPA has one global title, description, canonical URL, and Open Graph URL in [index.html](index.html#L10-L85); authenticated/private routes should not be indexable.
- No route-level metadata, sitemap, or robust public content strategy was confirmed.
- `robots` is `index, follow` globally, which risks indexing auth/dashboard/report routes.
- Structured data claims features such as multi-language support and health functions that should match real, publicly crawlable content.

### Recommended SEO architecture

1. Create a crawlable public landing page, documentation, methodology, safety, privacy, and research/evaluation pages.
2. Set `noindex, nofollow` for auth, dashboard, chat, reports, and user-specific routes.
3. Add route-level title/description/canonical metadata and Open Graph images.
4. Generate `sitemap.xml`, `robots.txt`, and localized `hreflang` only for genuinely translated pages.
5. Add Organization, WebSite, SoftwareApplication, FAQ, and Article schema only where the visible content supports it.
6. Avoid medical claims that imply diagnosis or guaranteed accuracy; align copy with research-prototype status.
7. Optimize Core Web Vitals: reduce large JS chunks, lazy-load chart/PDF/ML UI, preload only critical assets, and monitor LCP/INP/CLS.

### Accessibility

Run axe and Lighthouse in CI across landing, auth, assessment, chat, dashboard, and report routes. Verify keyboard navigation, focus return after dialogs, semantic headings, labels, error association, `aria-live` for streaming/chat/status updates, color contrast, reduced motion, screen-reader table/chart alternatives, and consent/payment accessibility. Review image alt text such as [OptimizedImage.tsx](src/components/OptimizedImage.tsx#L65-L80) based on whether each image is decorative or informative.

## Portfolio Enhancements for German Hiring Managers

The most persuasive improvement is not adding more features; it is showing engineering judgment and evidence.

- Add an architecture decision record explaining the single identity model and service boundaries.
- Publish a threat model, abuse-case tests, RLS test matrix, and a redacted incident postmortem.
- Add a model card and dataset card with limitations, calibration, subgroup results, and known failure cases.
- Show an evaluation dashboard with reproducible commands and fixed dataset versions.
- Add OpenTelemetry traces with privacy-safe attributes and a cost-per-assessment metric.
- Add CI gates for type checking, dependency CVEs, SBOM, secret scanning, container scanning, migrations, contract tests, and accessibility.
- Add German/English localization, GDPR self-service controls, and a transparent “not medical advice” workflow.
- Include a short demo mode that is unmistakably labeled and cannot be enabled by accidental production fallback.
- Use semantic commit history, ADRs, changelog entries, and a release checklist to demonstrate team-ready delivery.

## Ordered Remediation Roadmap

### Phase 0: Contain risk, 1-3 days

1. Disable public production access to health assessment, digital twin, and medical-report functions until auth and rate limits are verified.
2. Rotate any potentially exposed secrets; remove key prefix/length logging.
3. Disable personalized report caching or make it user/context/version scoped.
4. Add temporary provider spend limits and monitoring.
5. Mark demo/fallback output unmistakably and disable it in production.

### Phase 1: Identity and authorization, week 1

1. Standardize on Supabase Auth and verify JWT issuer, audience, expiry, and signing keys in FastAPI.
2. Derive user identity server-side for every route and Edge Function.
3. Enforce session ownership, report ownership, twin ownership, and payment ownership.
4. Add negative tests for IDOR, cross-session injection, forged payment references, and anonymous report creation.
5. Review every RLS policy against a generated access matrix.

### Phase 2: Data and payment integrity, week 2

1. Implement atomic payment state transitions and idempotency.
2. Add database constraints and migration smoke tests.
3. Define retention, deletion, export, consent, audit, and processor boundaries.
4. Replace raw logging with structured redaction.

### Phase 3: AI safety and evaluation, weeks 3-4

1. Separate triage, education, and assessment contracts.
2. Add deterministic red-flag and medication safety gates.
3. Version prompts/models/knowledge and build a regression set.
4. Calibrate confidence and publish model/dataset cards.
5. Add adversarial prompt-injection and malformed-output tests.

### Phase 4: Delivery quality, weeks 4-6

1. Rebuild from clean Python/Node environments with lock verification.
2. Pin Docker image digests and remove insecure Compose defaults.
3. Make CI fail on secret-scan findings, critical/high dependency vulnerabilities, type errors, and missing security tests.
4. Add Playwright, axe, Lighthouse, API contract, RLS integration, and load tests.
5. Fix the 111 lint warnings or document narrowly justified exceptions.

### Phase 5: Germany-ready product, weeks 6-10

1. Complete DPIA, processor/transfer review, AI Act/MDR assessment, and incident process.
2. Add German localization and Germany-appropriate emergency/privacy UX.
3. Publish transparent public documentation and SEO-safe routes.
4. Produce a portfolio case study showing the original vulnerability, remediation, tests, metrics, and remaining limitations.

## Acceptance Criteria Before Claiming Production Readiness

- No Critical/High findings open.
- Every personalized API operation has an authenticated, server-derived tenant/user identity.
- Cross-user and cross-session tests pass against a disposable database and Supabase project.
- Payment verification is user-bound, idempotent, atomic, and webhook-tested.
- No raw health data or secret metadata appears in logs, traces, browser console, analytics, or error reports.
- AI safety evaluation has published thresholds for red-flag recall, unsafe advice, groundedness, and calibration.
- Backend tests pass from a clean pinned environment; frontend tests include real route flows.
- Dependency, container, secret, SBOM, accessibility, and migration checks are enforced in CI.
- Privacy/retention/consent/deletion/export controls are implemented and documented.
- Public SEO routes are deliberate; private health routes are not indexable.

## Final Assessment

Telivus AI can become an excellent Germany-oriented AI/ML security portfolio project because it contains real trade-offs rather than a toy CRUD surface. The strongest story is a disciplined transformation: identify the identity and payment flaws, prove the fixes with adversarial tests, make model behavior measurable, and document privacy and clinical boundaries honestly. Until that work is complete, present it as a research prototype and engineering case study, not a compliant medical product.