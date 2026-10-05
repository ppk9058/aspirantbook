# TrillionSkill Service Level Agreement Baseline

**Status:** Draft framework; no external SLA or numeric commitment is approved  
**Audience:** Product owner, operations, customer support, customers if later approved

## Service and scope
The service is the TrillionSkill web learning and exam-preparation application and its configured dependencies. This document is an internal baseline only. The repository scan did not establish production hosting, support coverage, service hours, uptime history, or vendor obligations.

## Proposed service measures
| Measure | Definition | Target | Owner/evidence |
|---|---|---|---|
| Availability | Successful eligible learner requests / eligible requests in period | TBD after baseline and approval | Operations metrics |
| Critical journey success | Completion of agreed login/course/attempt journeys | TBD | Synthetic checks and real-user monitoring |
| Incident response | Time to acknowledge/communicate by severity | TBD; support coverage must be funded | On-call records |
| Recovery time (RTO) | Maximum agreed service restoration time | TBD | Restore exercise |
| Recovery point (RPO) | Maximum accepted data loss window | TBD | Backup policy and restore test |

Do not publish these as customer commitments until owners approve measurement, exclusions, remedies, support hours, escalation, and dependency terms.

## Dependencies and exclusions to resolve
Availability depends on application hosting, PostgreSQL, authentication, payment providers, object storage, code execution, and live media where enabled. Define planned maintenance, customer network/device issues, provider outage treatment, force majeure, data-retention, and incident notification after legal review.

## Review and approval
Set a measurement window, baseline, target, reporting owner, support coverage, escalation contacts, and sign-off date. Link monitoring evidence and review at least on material architecture or service changes.
