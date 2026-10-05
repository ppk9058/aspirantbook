# Data Governance and Lineage for AI-Assisted Content

**Status:** Proposed minimum register. Data owners must complete actual systems, retention periods, and legal/contractual approvals before external model use.

## Why this matters here

TrillionSkill stores and manages course, question, test, and learner information. Teacher-assisted parsing may receive pasted exam text; a future hosted model would create a new data boundary. The repository scan does not establish that user content currently leaves the platform for model inference. This register makes that boundary explicit before it is added.

## Data inventory and lineage

| Data class | Examples | Default handling | Lineage fields to record |
|---|---|---|---|
| Public curriculum metadata | Subject, topic, exam category | May be used for approved authoring tasks | Source/catalog ID, owner, version |
| Licensed or imported question material | Paper text, answer key, explanations | Verify rights and allowed transformation before use | Source, license/permission, import date, importer, transformation, reviewer |
| Teacher-provided prompt | Topic request or pasted paper | Treat as untrusted; minimize and validate; external transfer requires approval | Feature/action, role, timestamp, source classification, redaction result |
| Generated or parsed draft | Question, options, answer, explanation | Draft only; human review before publication | Source mode (parser/model), code/model and prompt version if applicable, reviewer, approval/edit history |
| Learner records | Identity, progress, assessment responses | Exclude from authoring prompts by default; restrict access and retention | System of record, purpose, access role, retention rule |
| Telemetry | Latency, error code, token/cost counters | Aggregate where possible; do not log raw prompt by default | Feature version, provider/model version if any, time bucket, outcome |

## Data quality gates

Check required fields, option count, answer-key range, language, duplicate content, source attribution, and subject/topic consistency before a draft enters the review queue. A parser must distinguish “not found” from a guessed value. A model output must pass schema and safety checks but still requires subject-matter review; schema validity is not factual correctness.

## External-provider boundary

Before sending any data to Gemini or another provider, security/privacy owners must approve the provider, purpose, data categories, retention and training terms, access controls, regional/legal constraints, deletion path, and incident contacts. Keep credentials server-side. Do not put secrets or unnecessary identifiers in prompts or application logs.

## Retention, correction, and deletion

Use the platform’s approved retention and deletion policy for source documents, drafts, audit history, and telemetry. Do not create a shadow dataset for training or evaluation from learner data without a separately approved purpose and consent/legal basis. Corrected content should retain a traceable editorial history consistent with existing platform behavior.

## Data flow

`Authorized teacher → validated topic/paper → rights and data-minimization check → parser or approved provider → schema/safety checks → editable draft → teacher review → normal content publication`

External provider call is a conditional future branch, not a claim about current repository behavior.

