# AI Observability and Incident Controls

**Status:** Proposed control set, activated only for a live model-backed feature. Current inspected route does not establish external model inference.

## Signals to measure

| Signal | Safe measurement | Response owner |
|---|---|---|
| Availability and failure | Request count, status class, timeout, provider error code | Engineering |
| Latency | p50/p95 by feature and provider/model version | Engineering |
| Cost and usage | Aggregate call/token estimate and spend against approved cap | Product/Finance + Engineering |
| Quality | Expert sample results, teacher edit/reject rate, answer-key corrections | Academic/Product |
| Safety/privacy | Redacted incident category and severity; avoid raw prompt logging by default | Security/Privacy |
| Change health | Parser/prompt/schema/provider version and release identifier | Engineering |

Set numeric service targets and alert thresholds only after the owner has a baseline and budget. Existing SLA values elsewhere in the handbook are placeholders until approved.

## Safe telemetry rules

Do not log raw learner prompts, assessment responses, identifiers, secrets, or provider payloads by default. Use correlation IDs that do not expose account identity, redact errors, restrict telemetry access, and set a documented retention period. If forensic prompt capture is necessary, obtain approval, minimize fields, restrict access, and define deletion.

## Incident playbook

1. Triage impact: incorrect answer key, unsafe content, privacy exposure, provider outage, cost spike, or quality regression.
2. Disable the affected assistance path using the server-enforced kill switch; preserve manual authoring and learning access.
3. Contain affected drafts/content and protect evidence with least-privilege access.
4. Notify product, academic, security/privacy, and operations owners according to severity.
5. Correct affected content, recover service, and communicate through the approved support path.
6. Record root cause, timeline, affected cohort, remediation, evaluation regression case, and follow-up owner.

## Drift and retraining boundary

Data drift and concept drift are relevant only if a deployed model has a defined input/output distribution and reliable labels or performance signals. No such training or drift pipeline is verified for the current authoring route. For a hosted LLM, prioritize version-change evaluation, output-quality sampling, provider health, and cost/latency monitoring. Do not trigger automatic retraining from noisy learner behavior without a separately approved data and model lifecycle.

