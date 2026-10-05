# AI Architecture Decisions and Data-Flow Register

**Status:** Proposed architecture record set. Confirm implementation paths against deployed infrastructure before relying on them operationally.

## Current evidence and boundary

The inspected teacher question-authoring client calls `/api/exam/ai-parse`; the route checks TEACHER/ADMIN authentication. `parse-text` uses in-process text parsing and `generate-topic` uses a curated code bank. The repository includes `@google/generative-ai` and an admin diagnostic checks whether `GEMINI_API_KEY` is set, but the inspected route has no provider call. Therefore the external-model boundary below is an architecture decision to make if model inference is implemented, not the current verified path.

## Decision register

| ADR | Decision to record | Current position | Revisit when |
|---|---|---|---|
| ADR-AI-01 | Which user and task receives assistance? | Limit initial scope to teacher/admin question drafting based on observed UI. | Product proposes learner-facing tutor or grading. |
| ADR-AI-02 | Deterministic parser vs hosted LLM | Existing route is deterministic; no live LLM call found in this path. | Provider integration is proposed. |
| ADR-AI-03 | Human review and publication boundary | Draft remains editable; require explicit educator approval before publication. | Workflow or role permissions change. |
| ADR-AI-04 | Provider, model, region, and data contract | TBD; no deployed model/provider can be inferred from package/config alone. | Before first external inference. |
| ADR-AI-05 | Prompt/output versioning and fallback | TBD; record version, validation, timeout, safe fallback, and kill-switch. | Before provider integration and each material change. |
| ADR-AI-06 | Model registry, feature store, training | Not justified for current inspected route; no training pipeline evidenced. | A trained/hosted model or durable learned features are approved. |

## Logical data-flow diagrams

### Current inspected deterministic flow

`Teacher/Admin UI → authenticated Next.js route → regex parser or curated question bank → draft fields in authoring UI → human edits and normal save/publish flow`

### Conditional hosted-model flow

`Teacher/Admin → role and input validation → rights/privacy filter → provider adapter (secret kept server-side) → schema and safety validation → editable draft + provenance → teacher review → publish`

The conditional flow must add timeout, rate/cost limits, provider circuit breaker, model/prompt version tracking, safe logging, and an admin kill switch before release.

## Architecture constraints

- Keep authorization and provider credentials on the server; never trust the client toggle for access control.
- Keep external inference behind one auditable server-side adapter with an explicit provider/model configuration.
- Treat pasted papers and provider output as untrusted text; validate structure and use safe rendering.
- Do not add a feature store, model registry, retraining job, or vector database unless a measurable product requirement calls for it.
- Record a dated ADR for provider choice, data region, retention/training terms, fallback, and evaluation gate.

