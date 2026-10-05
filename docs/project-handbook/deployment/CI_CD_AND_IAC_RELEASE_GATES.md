# CI/CD and Infrastructure Release Gates

**Status:** Target workflow proposal. A repository scan and this document do not confirm a live CI/CD provider, workflow, infrastructure-as-code stack, or automated promotion path.

## What is known and unknown

The repository defines a Next.js/TypeScript application and documents local commands in its project rules. No CI/CD provider, environment credentials, deployed infrastructure, or production promotion process is asserted here. Confirm `.github/workflows` or the actual configured CI system and deployment host with the project owner before treating any stage as operational.

## Proposed pipeline

`Pull request → lint + typecheck + unit/integration checks → build + dependency/security checks → review/approval → DEV deploy → QA/TEST verification → UAT sign-off → production approval → controlled deploy + smoke checks → monitor/rollback`

| Gate | Required evidence | Promotion rule |
|---|---|---|
| Source review | Linked issue, reviewed diff, protected main branch, no committed secrets | Merge only after required reviewers approve |
| Static checks | Lint, TypeScript, unit/integration suite, production build | All required checks pass |
| Supply-chain/security | Lockfile/dependency scan, secret scan, image/IaC scan if applicable | No blocking finding or documented security exception |
| AI/content checks (when applicable) | Evaluation and red-team results, human approval boundary, data/rights review | Named product/academic/security owners approve |
| DEV | Deployment identifier, migrations dry-run where available, smoke check | Engineering owner signs evidence |
| TEST/UAT | Role-based journeys, regression, content approval, UAT decision | Test owner and business owner approve |
| PROD | Back-up/restore or rollback readiness, change window, release notes, alert coverage | Explicit production approver authorizes |
| Post-deploy | Health, auth, purchase/assessment critical paths as applicable, error and latency signals | Roll back or stop rollout on defined threshold breach |

## Infrastructure-as-code and secrets

If IaC is adopted, version reviewed manifests, separate environment configuration, scan plans for public exposure and destructive changes, and require approval before applying production changes. Keep secrets in the approved secret manager; never put credentials in source, logs, or example documents. Database migrations must follow the project migration policy and verified backup/restore procedure. Do not infer cloud vendor or database host from SDK dependencies alone.

## Environment promotion diagram

`Code → automated evidence → DEV → TEST/QA → UAT owner sign-off → PROD approval → smoke + observe`

Each arrow is a gate with an owner and traceable evidence, not an assumed automatic deployment. Define exact environment names, URLs, owners, data classes, and promotion permissions in the deployment inventory before wiring automation.

