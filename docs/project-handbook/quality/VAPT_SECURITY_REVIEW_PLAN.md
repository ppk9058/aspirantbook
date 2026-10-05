# Vulnerability Assessment and Security Review Plan

**Status:** Proposed security work item; this is not a completed VAPT report or certification.

## Scope

Review the teacher/admin question-authoring route, authentication and role enforcement, input validation and size limits, content rendering, imported files/text, provider integration if enabled, secrets, logs, rate limits, and the deployment boundary. Include adjacent admin settings that control AI availability. Confirm production routes and infrastructure with the security owner before assessment.

## Threats and checks

| Threat | Review evidence |
|---|---|
| Anonymous/student access to staff authoring | Direct API authorization tests for unauthenticated, STUDENT, TEACHER, and ADMIN roles |
| Prompt injection / untrusted imports | Adversarial cases; verify imported instructions cannot override system policy or retrieve secrets |
| Data leakage | Inspect prompt construction, provider payload, logs, error responses, analytics, and retention |
| Secret exposure | Verify keys remain server-side, are redacted from diagnostics, and are rotated through approved process |
| Abuse and cost exhaustion | Request-size and rate-limit checks, quotas, timeout, retry limits, budget alerts, circuit breaker |
| Cross-site scripting / unsafe markup | Verify output is rendered as escaped/sanitized content through existing safe paths |
| Supply-chain risk | Dependency review, lockfile integrity, vulnerability triage, provider SDK maintenance owner |
| Authorization bypass via feature flag | Confirm server independently checks role and disabled state for direct requests |

## Finding handling

Track severity, affected build/route, reproducible evidence, owner, remediation, retest result, and accepted-risk approver. Block release for critical/high findings affecting learner data, authorization, secret exposure, or unsafe content unless an authorized security owner documents an exception. Record an assessment date and tested commit. Until this work is performed, status remains **not assessed in this handbook**.

