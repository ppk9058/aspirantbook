# TrillionSkill Decommissioning Protocol

**Status:** Controlled checklist; use only after an approved EOL decision  
**Audience:** Operations, database, security, product, legal/privacy

## Before the window
- [ ] Confirm signed EOL decision, scope, timeline, stakeholders, and legal/privacy/contract review.
- [ ] Notify learners, staff, vendors, support, and any required authorities; record delivery evidence.
- [ ] Stop new enrollment/sales at approved time; define handling of active attempts, refunds and entitlements.
- [ ] Inventory domains, DNS, hosting, database, object storage, queues, caches, payment providers, OAuth, email, analytics, code execution, RTC, secrets, backups, and scheduled jobs.
- [ ] Create approved archive/export; validate record counts, integrity, encryption, access and retention owner.
- [ ] Verify restore/read procedure and set deletion dates for data not legally retained.

## Decommission sequence
1. Enable approved read-only or closure experience; preserve support/contact path.
2. Drain jobs and webhooks; reconcile in-flight payments/refunds and record provider state.
3. Revoke app/client/provider credentials and service accounts after archive verification.
4. Disable integrations and scheduled jobs, then remove application ingress and deployment resources.
5. Remove DNS/CDN and public assets after redirects/notices are approved.
6. Retain encrypted archive/backups under named owner and expiry schedule; delete other data through approved process.
7. Confirm vendor cancellation, final invoices, access removal, and no residual public buckets or secrets.

## Verification and sign-off
Capture timestamps and evidence for every system. Security verifies credentials and public exposure; database owner verifies archive/retention/deletion; finance reconciles payments; product/support confirms notices and closure path; legal/privacy approves records disposition. Escalate any mismatch and stop the next irreversible step.

## Irreversible action gate
Production deletion, key revocation that prevents recovery, domain cancellation, and permanent backup expiry require explicit written approval from the named data owner and the required legal/privacy approver. A dry run and recoverable backup are prerequisites.
