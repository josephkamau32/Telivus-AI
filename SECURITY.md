# Security Policy — Telivus AI

## 🔒 Security Architecture

### Authentication & Authorization
- **JWT Authentication**: Custom JWT implementation using `python-jose` + `passlib` with bcrypt hashing
- **Token Rotation**: Access + refresh token pattern with configurable expiry
- **Rate Limiting**: SlowAPI middleware to prevent brute-force and abuse
- **CORS Whitelist**: Strict origin validation for API access

### Input Validation & Sanitization
- **Pydantic V2 Models**: All API inputs validated with strict type enforcement
- **Request Sanitization Middleware**: Custom ASGI middleware that intercepts and sanitizes JSON bodies
- **SQL Injection Detection**: Automated pattern matching on all incoming request payloads
- **Command Injection Detection**: Pattern matching for OS command injection attempts
- **PII Anonymization**: Personal identifiable information stripped before LLM prompt execution

### Security Headers (CSP, HSTS)
All responses include hardened security headers via middleware:

| Header | Value |
|---|---|
| `Content-Security-Policy` | Restrictive CSP with explicit allowlist for scripts, styles, fonts, and API connections |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` (production only) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera, microphone, geolocation, payment — all disabled |

### Secret Management
- **`detect-secrets`**: Pre-commit hook scans every commit for leaked credentials
- **Bandit**: Static security analysis for Python code (SQL injection, hardcoded passwords, etc.)
- **`.env` files**: All secrets loaded from environment variables, never committed
- **CI Secret Scan**: GitHub Actions job runs `detect-secrets scan` on every push

### Container Security
- **Non-root user**: Backend runs as `appuser` (UID 1000) inside Docker containers
- **Read-only mounts**: Application code mounted as read-only in production
- **Multi-stage builds**: Minimal runtime image without build tools or compilers
- **Health checks**: Container-level health probes for automatic restart on failure

---

## 🚨 Security Checklist

### Before Deployment
- [ ] `DEBUG=False` in production environment
- [ ] `SECRET_KEY` rotated and set to a strong random value
- [ ] All API keys set as environment variables (not in code)
- [ ] CORS origins restricted to production domain(s)
- [ ] Rate limiting configured and tested
- [ ] `detect-secrets` baseline updated

### Ongoing Maintenance
- [ ] Dependabot PRs reviewed weekly
- [ ] `npm audit` and `pip-audit` run monthly
- [ ] API keys rotated quarterly
- [ ] Access logs monitored for anomalies

---

## 📞 Reporting Vulnerabilities

> **Do not open public issues for security vulnerabilities.**

Report to: **security@telivus.ai**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

We aim to acknowledge reports within 48 hours and provide a fix timeline within 7 days.

---

## 🔧 Security Tooling

| Tool | Purpose | Integration |
|---|---|---|
| `detect-secrets` | Credential leak prevention | Pre-commit hook + CI |
| `bandit` | Python security linting | Pre-commit hook |
| `ruff` | Linting (includes security rules) | Pre-commit hook + CI |
| `mypy` | Type safety enforcement | Pre-commit hook + CI |
| Dependabot | Automated dependency updates | GitHub |
| CSP Headers | Browser-level resource restriction | FastAPI middleware |
| Pydantic V2 | Runtime input validation | API layer |
