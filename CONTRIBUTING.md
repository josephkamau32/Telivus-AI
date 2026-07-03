# Contributing to Telivus AI

Thank you for your interest in contributing to Telivus AI! This document outlines the process for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Code Style & Quality](#code-style--quality)
- [Security](#security)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior to security@telivus.ai.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (check `.nvmrc` or `package.json` engines field)
- **Python** 3.11+ (check `runtime.txt` or `pyproject.toml`)
- **Git** with commitlint hook support
- **Docker** & **Docker Compose** (optional, for full stack)

### Local Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/Telivus-AI.git
cd Telivus-AI

# 2. Install pre-commit hooks
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

# 3. Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and other secrets

# 4. Start development servers
# Terminal 1: Frontend
npm install
npm run dev

# Terminal 2: Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Development Workflow

### Branch Naming

Use descriptive branch names following this pattern:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/add-trajectory-chart` |
| Bug Fix | `fix/<short-description>` | `fix/cors-header-missing` |
| Documentation | `docs/<short-description>` | `docs/update-api-examples` |
| Refactor | `refactor/<short-description>` | `refactor/agent-base-class` |
| Test | `test/<short-description>` | `test/add-ccee-coverage` |
| Chore | `chore/<short-description>` | `chore/update-dependencies` |

### Making Changes

1. **Create a feature branch** from `main`
2. **Make focused, atomic commits** (one logical change per commit)
3. **Write tests** for new functionality
4. **Run pre-commit hooks** locally before pushing
5. **Push to your fork** and open a Pull Request

---

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) enforced by commitlint.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Allowed Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, missing semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding missing tests or correcting existing tests |
| `chore` | Changes to build process, auxiliary tools, dependencies |
| `ci` | Changes to CI configuration files and scripts |
| `build` | Changes that affect the build system or external dependencies |
| `revert` | Reverts a previous commit |

### Examples

```bash
# Feature
git commit -m "feat(agent): add emergency detection fallback engine"

# Bug fix with scope
git commit -m "fix(api): handle rate limit headers in OpenAI client"

# Breaking change
git commit -m "feat(api)!: change assessment response schema

BREAKING CHANGE: response format changed from flat to nested structure"

# Documentation
git commit -m "docs(readme): add troubleshooting section for CORS errors"
```

### Commit Message Rules

- **Subject line**: Max 72 characters, imperative mood ("add" not "added")
- **Body**: Wrap at 72 characters, explain *what* and *why* (not *how*)
- **Footer**: Reference issues (`Closes #123`), breaking changes (`BREAKING CHANGE:`)

---

## Pull Request Process

### Before Opening a PR

- [ ] All pre-commit hooks pass locally (`pre-commit run --all-files`)
- [ ] Tests pass (`npm run test:run` and `cd backend && pytest --cov=app --cov-fail-under=70`)
- [ ] Type checking passes (`npm run lint` and `cd backend && mypy app/`)
- [ ] Build succeeds (`npm run build` and `cd backend && python -m py_compile app/main.py`)
- [ ] No new security warnings (`bandit -r backend/app`)

### PR Requirements

1. **Title**: Follow Conventional Commits format (e.g., `feat: add trajectory prediction API`)
2. **Description**: Use the PR template (`.github/pull_request_template.md`)
3. **Linked Issues**: Reference related issues (`Closes #123`, `Relates to #456`)
4. **Screenshots**: Include for UI changes
5. **Breaking Changes**: Clearly marked in description and commit message

### Review Process

1. **Automated checks** must pass (CI pipeline)
2. **Code review** by at least one maintainer
3. **All conversations resolved**
4. **Squash and merge** (maintains clean history)

---

## Testing Requirements

### Backend (Python)

```bash
cd backend

# Run all tests with coverage
pytest --cov=app --cov-report=term-missing --cov-fail-under=70 -v

# Run specific test file
pytest tests/unit/test_health_assessment.py -v

# Run with verbose output and no coverage
pytest -v --no-cov
```

**Requirements**:
- Minimum **70% coverage** (enforced in CI)
- All new functions/classes must have tests
- Mock external dependencies (OpenAI, Redis, PostgreSQL)
- Use `pytest-mock` and `faker` for test data

### Frontend (TypeScript/React)

```bash
# Run tests
npm run test:run

# Run tests with UI
npm run test

# Run type checking
npm run lint
```

**Requirements**:
- Test new components with React Testing Library
- Test custom hooks with `@testing-library/react-hooks`
- Mock API calls with MSW or Vitest mocks

### Integration Tests

```bash
# Backend integration tests (requires running services)
cd backend
pytest tests/integration/ -v

# Full stack with Docker
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit
```

---

## Code Style & Quality

### Python (Backend)

| Tool | Purpose | Config |
|------|---------|--------|
| **Ruff** | Linting & formatting | `pyproject.toml` |
| **Black** | Code formatting | `pyproject.toml` |
| **isort** | Import sorting | `pyproject.toml` |
| **mypy** | Static type checking | `pyproject.toml` |
| **Bandit** | Security linting | `pyproject.toml` |

**Run locally**:
```bash
cd backend
ruff check . --fix
ruff format .
mypy app/ --ignore-missing-imports
bandit -r app/
```

### TypeScript/React (Frontend)

| Tool | Purpose | Config |
|------|---------|--------|
| **ESLint** | Linting | `eslint.config.js` |
| **Prettier** | Formatting | `.prettierrc` |
| **TypeScript** | Type checking | `tsconfig.json` |

**Run locally**:
```bash
npm run lint
npm run format
npx tsc --noEmit
```

### Pre-commit Hooks

The project uses **13 pre-commit hooks** (configured in `.pre-commit-config.yaml`):

```bash
# Run all hooks manually
pre-commit run --all-files

# Run specific hook
pre-commit run ruff --all-files
pre-commit run detect-secrets --all-files
```

**Hooks include**:
- `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-json`
- `check-merge-conflict`, `detect-private-key`, `detect-secrets`
- `ruff` (lint + format), `black`, `isort`, `flake8`, `mypy`, `bandit`
- `eslint` (frontend)

---

## Security

### Reporting Vulnerabilities

**Do not open public issues for security vulnerabilities.**

Report to: **security@telivus.ai**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Practices

- **Never commit secrets** (API keys, passwords, tokens)
- **Use `.env` files** for local development (gitignored)
- **Rotate keys** if accidentally committed
- **Run `detect-secrets`** before committing
- **Keep dependencies updated** (Dependabot PRs reviewed weekly)

### Secret Scanning

```bash
# Scan for secrets locally
detect-secrets scan --baseline .secrets.baseline

# Update baseline after false positive review
detect-secrets scan --update .secrets.baseline
```

---

## Documentation

### When to Update Docs

- **New API endpoints**: Update `README.md` API examples and OpenAPI docs
- **New features**: Update relevant section in `README.md` and `AI_ARCHITECTURE.md`
- **Configuration changes**: Update `.env.example` and `README.md` Environment Variables
- **Breaking changes**: Update `CHANGELOG.md` (if exists) and migration guide

### Documentation Standards

- Use clear, concise language
- Include code examples for API changes
- Update table of contents if adding sections
- Keep diagrams (Mermaid) up to date

---

## Release Process

Releases are managed by maintainers:

1. Version bump in `package.json`, `pyproject.toml`, `backend/pyproject.toml`
2. Update `CHANGELOG.md`
3. Create GitHub Release with notes
4. Docker images built and pushed via CI
5. Frontend deployed to Vercel, Backend to Render

---

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/josephkamau32/Telivus-AI/discussions)
- **Bugs**: Open an [Issue](https://github.com/josephkamau32/Telivus-AI/issues) with template
- **Security**: Email security@telivus.ai
- **General**: Check existing issues and docs first

---

## Recognition

Contributors are recognized in:
- GitHub Contributors graph
- Release notes
- README acknowledgments (for significant contributions)

---

Thank you for contributing to Telivus AI! 🚀