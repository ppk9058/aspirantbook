# AI Ethics and Learner Safety Charter

**Applies to:** AI-assisted authoring, parsing, tutoring, recommendations, analytics, and any future model-backed feature in TrillionSkill.  
**Status:** Proposed project policy; adopt through named product, academic, privacy, and security owners.

## Our learner-first promise

AI may assist educators and learners, but it must not silently replace educator judgment or present unverified generated material as official exam truth. For the currently inspected question-authoring route, staff review is the required publication boundary. Any future learner-facing feature needs its own approval and age-appropriate safeguards.

## Principles and controls

| Principle | TrillionSkill control |
|---|---|
| Human accountability | A named teacher/editor owns approval of generated question text, choices, answer, and explanation before publication. Keep author and reviewer identity in the normal content audit trail where supported. |
| Accuracy and transparency | Label assistance clearly; distinguish imported, authored, parsed, and generated content. Do not promise model accuracy without measured evidence. |
| Fairness and language access | Evaluate English and Hindi separately, across subjects and difficulty levels. Do not infer learner ability or deny opportunity from unvalidated model output. |
| Privacy and minimization | Send only fields needed for the task; exclude account identifiers, payment data, private learner progress, and live assessment answers unless a separately approved purpose requires them. |
| Rights and provenance | Record source, license/permission, import date, transformation, and reviewer for question-bank content. |
| Safety and security | Treat learner/user text and imported documents as untrusted; test prompt injection, unsafe code, abusive content, and attempts to reveal secrets. |
| Contestability | Provide a staff correction path and a way to report harmful or incorrect content. Preserve a route to disable assistance. |
| Proportionate use | Do not use AI for high-impact grading, admission, discipline, or learner profiling without separate legal, academic, and safety review. |

## Required review before release

The feature owner must document intended users, affected learners, data categories, provider, output destinations, failure behavior, human review, retention, evaluation results, support contact, and a kill-switch owner. Reviewers must include product, academic/content, engineering, and privacy/security representatives appropriate to the data and feature.

## Escalation

Pause publication of affected AI-assisted content when an answer key is materially wrong, personal data is exposed, unsafe content reaches a learner, or a provider change causes a quality regression. Preserve the minimum evidence needed for investigation, restrict raw prompt access, notify the designated owner, correct or remove the affected content through normal content controls, and record the resolution in an incident review.

## Out of scope until separately approved

Autonomous publication; training on learner submissions; emotion/attention inference; automated high-impact decisions; use of identifiable learner data for provider training; and a learner-facing AI tutor. These are not authorized by the existence of an SDK, setting, or AI-labeled control in the repository.

