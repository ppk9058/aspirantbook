# AI Feature Requirements Appendix

**Parent documents:** BRD, PRD, FRD, FRS, and SRS.  
**Status:** Proposed acceptance criteria for an approved AI-assisted question-authoring feature. Product owner must confirm scope before implementation.

## Scope grounded in the repository

The teacher test-series creation UI posts `generate-topic` and `parse-text` actions to `/api/exam/ai-parse`. The endpoint requires an authenticated TEACHER or ADMIN session. In inspected code, `parse-text` uses regular expressions and `generate-topic` returns a curated in-code bank; neither action calls a hosted model. The frontend fills draft question fields from the response. These behaviors make staff-assisted question authoring the appropriate initial scope. A live Gemini feature, learner-facing tutor, or model training pipeline is a separate decision.

## Functional requirements

| ID | Requirement | Acceptance evidence |
|---|---|---|
| AI-FR-01 | Only authenticated TEACHER and ADMIN roles can invoke authoring assistance. | API tests prove anonymous and STUDENT requests receive 401/403; server enforces roles. |
| AI-FR-02 | Assistance returns editable draft questions; it never publishes or schedules them automatically. | End-to-end trace shows explicit human save/publish action after review. |
| AI-FR-03 | Draft includes question, four choices, answer, explanation, subject, topic, and difficulty where available. | Schema validation rejects incomplete or malformed output without silently inventing correctness. |
| AI-FR-04 | Staff can inspect and edit every returned field, reject the full draft, or retry within limits. | UI evidence covers edit, reject, retry, empty, loading, error, and timeout states. |
| AI-FR-05 | Parsing reports partial/zero extraction honestly and does not mark a guessed answer as verified. | Fixtures cover absent answer keys, malformed options, ambiguous text, and zero matches. |
| AI-FR-06 | If an external model is introduced, the UI identifies AI-assisted content and model/provider where policy requires. | Approved copy and provider/version metadata appear in the appropriate staff view/audit record. |
| AI-FR-07 | Administrators can disable the feature; server-side enforcement is authoritative. | Disabled configuration prevents calls, including direct API requests. |

## Quality targets to set before pilot

Define numeric thresholds only after establishing a reviewed baseline. Required measures: expert-rated factual correctness, answer-key correctness, curriculum alignment, explanation usefulness, teacher accept/edit/reject rate, English and Hindi parity, p50/p95 latency, timeout/error rate, and cost per accepted item. No accuracy, latency, or cost target is claimed by this document.

## Data SLA and privacy requirements

For any hosted-model path, document allowed inputs, maximum size, classification, source rights, redaction, provider retention/training terms, region where applicable, transport security, log fields, deletion/retention, and breach contact. Raw learner identifiers, private progress, payment records, and active assessment responses are excluded by default. Store only the output and provenance needed for normal editorial review; do not retain raw prompts indefinitely.

## Non-functional requirements

- Fail closed for authorization and fail safely for provider errors; never publish partial output automatically.
- Apply request-size limits, per-user rate limits, request timeout, budget cap, and provider circuit breaker before enabling external inference.
- Validate output against a strict schema and escape/sanitize rendered text through existing safe content paths.
- Support English and Hindi as separate evaluated languages; do not fabricate Hindi text by merely prefixing an English string and treating it as a translation.
- Preserve a manual authoring path if assistance is disabled, offline, over budget, or unavailable.

