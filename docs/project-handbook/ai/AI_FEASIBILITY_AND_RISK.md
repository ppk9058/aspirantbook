# AI Feasibility and Risk Assessment

**Project:** TrillionSkill learning and exam-preparation platform  
**Status:** Assessment based on repository inspection; business approval and measured cost data remain open.

## Decision in one minute

TrillionSkill has teacher-facing question authoring flows labelled AI, including topic-based question creation and paper-text parsing. The inspected `/api/exam/ai-parse` implementation currently parses text with regular expressions and returns a curated question bank; it does not call Gemini. A Gemini SDK dependency and an admin setting that reports whether `GEMINI_API_KEY` is configured exist, but these alone do not prove that model inference is live. Treat model-backed learner or staff features as **not approved for production by this evidence** until the owner confirms an actual integration and its boundaries.

The near-term feasible path is teacher-assisted authoring with mandatory human review. Do not position generated questions as authoritative exam content until correctness, curriculum fit, rights, privacy, and review ownership are measured and documented.

## Feasibility gates

| Gate | TrillionSkill question | Evidence needed to pass | Current status |
|---|---|---|---|
| User value | Does assistance reduce teacher authoring time without lowering question quality? | Pilot baseline, time saved, accepted-edit rate, teacher feedback | TBD |
| Technical | Is a model actually invoked, by which server route, provider, and model version? | Code path, provider contract, secrets boundary, timeout and fallback behavior | SDK/config indicators exist; inspected route uses deterministic code |
| Data and rights | Are prompts, imported papers, explanations, and source material authorized for this use? | Data inventory, rights review, retention and provider terms | TBD |
| Safety | Can incorrect answers, unsafe code advice, bias, or prompt injection reach learners? | Human review gate, red-team evidence, incident path | TBD |
| Cost | What is the cost per accepted item and at pilot peak load? | Token/call estimate, provider pricing, monthly cap and alert owner | No measured model spend found |
| Operations | Can staff disable the feature and recover safely? | Kill switch, owner, alerting, runbook, rollback evidence | A platform setting exists; scope and runtime enforcement need verification |

## Recommendation and stage gates

1. Confirm the product owner, users, and the specific task. Current observed UI is teacher/admin question authoring, not an established learner-facing tutor.
2. Measure a human-only baseline and define a small, opt-in teacher pilot.
3. Approve a data/rights inventory and provider review before sending any content outside TrillionSkill.
4. Build a versioned evaluation set with subject experts; require a teacher to inspect and explicitly approve each generated question before publication.
5. Pilot with rate limits, a cost ceiling, a kill switch, and a rollback plan. Expand only after the owner reviews quality, cost, and incident results.

## Risk register

| Risk | TrillionSkill impact | Required control / owner |
|---|---|---|
| Wrong answer or fabricated explanation | Learners prepare from incorrect material; exam trust falls | Subject-expert review and answer-key validation before publishing; Academic owner |
| Misleading “AI” label | Teachers expect model behavior that the current code may not provide | Describe the current deterministic behavior accurately; Product owner |
| Personal or assessment data sent to a provider | Privacy, contractual, and learner-trust exposure | Minimize/redact input; approve provider and retention terms; Privacy/Security owner |
| Copyrighted exam or course material reused | Takedown or rights dispute | Track provenance and allowed use per source; Content owner |
| Hindi/English quality gap | Unequal learning experience | Separate bilingual evaluation and human localization review; Academic owner |
| Prompt injection or malicious imported text | Unsafe output or unintended disclosure | Treat imports as untrusted; isolate instructions and test adversarial inputs; Security owner |
| Spend or latency spike | Feature becomes expensive or unusable | Per-user limits, timeout, budget alert, circuit breaker; Engineering owner |
| Provider/model change | Quality or policy behavior shifts without notice | Pin/version provider configuration where supported; run evaluations before promotion; Engineering owner |

## Cost and success measures to approve

Set explicit limits before a live-model pilot: monthly maximum spend, maximum calls per teacher/day, maximum input size, p95 response time, timeout, and alert threshold. Record cost per accepted question, teacher edit/reject rate, verified answer-key accuracy, and support incidents. Targets are intentionally **TBD** until the owner establishes a baseline and approves them.

## Flow

`Use case → rights/data check → safety and cost review → expert evaluation → gated pilot → owner review → expand, revise, or stop`

