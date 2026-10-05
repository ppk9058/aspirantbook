# TrillionSkill Operations Standard Procedures

**Status:** Operational procedures to tailor to the verified hosting platform  
**Audience:** On-call, support, database and release operators

## Routine procedures
### Daily service check
Review app health, database connectivity/capacity, error rate, latency, payment webhook failures, storage errors, execution-provider failures, and unresolved alerts. Record time range, dashboard, anomaly, owner, and action. Dashboard and alert provider: TBD.

### Payment reconciliation
Use provider event/order IDs and persisted application records. Verify webhook signature and expected currency/amount/state; reconcile duplicates and delayed callbacks idempotently. Never grant access from a screenshot or browser redirect. Escalate mismatches to finance and payment owner; retain evidence without exposing payment secrets.

### Content publishing
Confirm author role, syllabus/source and rights, editorial review, correct answer verification, language quality, preview in learner context, and approved publication state. Archive/correct content without deleting learner progress or historical records.

### Backup and restore
Follow the approved platform-specific backup policy, protect encryption keys, record backup identifier, restore to an isolated target, validate schema and representative records, and report actual RPO/RTO. A backup job is not proven until a restore exercise succeeds.

### Access and secrets
Grant least privilege, use managed secrets, rotate credentials through the provider procedure, review privileged access periodically, and record actor/time/reason. Do not paste secrets or learner data into tickets or logs.

## Incident handling
Declare severity using user impact and data/security risk. Stabilize first, preserve evidence, communicate through approved channel, assign incident lead and technical owner, track timeline, and complete RCA and follow-up actions. Use the runbook for release rollback and the RCA template for review.

## Procedure ownership
Before production, assign named primary/backup owners, system links, paging routes, support hours, escalation contacts, and review date for every procedure.
