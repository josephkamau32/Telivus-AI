# EU AI Act Compliance & DSGVO Readiness

> **Telivus AI is designed as an engineering portfolio demonstrating responsible AI practices aligned with European regulatory frameworks.**

---

## EU AI Act Risk Classification

Under the [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj) (Regulation 2024/1689), AI systems in healthcare may fall under **high-risk** categories (Annex III, Section 5).

### Telivus AI's Position

| Criterion | Assessment |
|---|---|
| **System Type** | AI-assisted health information tool (non-diagnostic) |
| **Risk Category** | Portfolio demonstration — not a deployed medical device |
| **Intended Use** | Educational prototype showcasing responsible AI engineering |
| **Medical Claims** | None — explicit disclaimers throughout |

> **Important**: If deployed as a production medical AI system, Telivus AI would require conformity assessment, CE marking, and compliance with Article 6 obligations for high-risk AI systems.

---

## DSGVO (GDPR) — Data Protection by Design

### Article 5 Principles — Implementation Mapping

| DSGVO Principle | Implementation |
|---|---|
| **Lawfulness** (Art. 6) | Consent-based processing; no health data stored without user action |
| **Data Minimization** (Art. 5(1)(c)) | User queries are ephemeral — not persisted beyond the session |
| **Purpose Limitation** (Art. 5(1)(b)) | Data used exclusively for health assessment response generation |
| **Storage Limitation** (Art. 5(1)(e)) | Redis cache with 24h TTL; no permanent health data storage |
| **Integrity & Confidentiality** (Art. 5(1)(f)) | TLS encryption, JWT auth, CSP headers, input sanitization |

### Article 17 — Right to Erasure

The architecture supports data deletion:
- Session data: automatically expires (Redis TTL)
- No persistent PII in logs (PII sanitization middleware)
- Database records: deletion endpoints planned (see Roadmap)

### Article 22 — Automated Decision-Making

Telivus AI provides:
- **Human-readable explanations** via CCEE (Confidence, Calibration, Explainability, Safety) module
- **Confidence scores** on every AI response
- **Safety flags** when the model is uncertain
- **Explicit disclaimers** that this is not a substitute for medical professionals

---

## Explainability & Transparency

### CCEE Module

The Confidence, Calibration, Explainability & Safety subsystem (`backend/app/services/ccee/`) ensures every AI output includes:

| Component | Purpose | EU AI Act Alignment |
|---|---|---|
| `confidence_engine.py` | Calibrated confidence scores | Art. 13 — Transparency |
| `explainability_engine.py` | Reasoning graphs | Art. 13 — Transparency |
| `safety_scorer.py` | Risk-based safety scoring | Art. 9 — Risk Management |
| `uncertainty_detector.py` | Model uncertainty detection | Art. 14 — Human Oversight |

### Frontend Transparency

Users can inspect:
- **ReasoningGraph**: Visual representation of how the AI reached its conclusion
- **CCEEDisplay**: Confidence scores, safety flags, and evidence sources

---

## On-Premise Deployment (Data Sovereignty)

Telivus AI is fully containerized and can be deployed in EU-sovereign infrastructure:

### Hetzner Cloud (Germany-based)
```bash
# Deploy to Hetzner Cloud with Docker Compose
ssh user@your-hetzner-server
git clone https://github.com/josephkamau32/Telivus-AI.git
cd Telivus-AI
cp .env.example .env  # Configure with your keys
docker-compose up -d
```

### Self-Hosted Observability
- **Langfuse**: Open-source, self-hostable LLM observability — all trace data stays within your infrastructure
- **Prometheus + Grafana**: Fully self-hosted monitoring stack included in `docker-compose.yml`

### Data Flow Guarantee
```
User → Your EU Server → OpenAI API (EU endpoint available)
         ↓
  All logs, traces, and cache data remain on your server
```

> **Note**: OpenAI offers [EU data residency](https://platform.openai.com/docs/guides/data-residency) options. For complete data sovereignty, swap to a self-hosted LLM (e.g., Llama 3 via Ollama) — the LangChain architecture supports drop-in LLM provider changes.

---

## Compliance Roadmap

- [ ] GDPR-compliant data deletion API endpoint (Art. 17)
- [ ] Data Processing Agreement (DPA) template
- [ ] Privacy Impact Assessment (DPIA) document
- [ ] Consent management UI component
- [ ] Audit logging for AI decisions (Art. 12 EU AI Act)
- [ ] Model card documentation (Art. 13 EU AI Act)
