# TrillionSkill Engineering Guide

**Status:** Repository-facing starter guide; validate commands against the current branch  
**Audience:** Contributors and operators

## What this project is
TrillionSkill (repository package name `aspirantbook`) is a mobile-first learning and exam-preparation product built with Next.js App Router, React, TypeScript, Tailwind, Prisma, and PostgreSQL. The application includes learner journeys and staff content/administration surfaces. Current code presence does not prove a feature is launch-ready.

## Start here
1. Read this guide, `AGENTS.md`, and `docs/responsive-ui-standards.md` before UI work.
2. Use a separate local database and local-only credentials. Never copy production secrets or personal data into development.
3. Install dependencies with the repository lockfile and generate Prisma client as needed.
4. Configure required environment values from `.env.example`; use test provider credentials only.
5. Run `npm run dev` for local development. Validate a change with the relevant scripts and review its data/security impact.

## Common commands
| Goal | Command | Notes |
|---|---|---|
| Development server | `npm run dev` | Local use; avoid exposing secrets in logs |
| Production build | `npm run build` | Does not prove runtime/provider correctness |
| Lint | `npm run lint` | Check actual script behavior for the installed Next.js version |
| Type check | `npx tsc --noEmit` | Repository package may not define `typecheck` |
| Start test database | `npm run test:db:up` | Uses Docker Compose test DB; inspect compose config first |
| Prisma migrations | `npx prisma migrate dev --name <name>` | Development/test database only |
| Deploy migrations | `npx prisma migrate deploy` | Target approval and backup/rollback plan required |

## Working rules
Never use `prisma db push` on production. Do not delete learner data, change established IDs, or persist runtime state to local disk. Validate server-side roles and action inputs. Keep feature parity across responsive layouts. Existing docs can be stale; prefer current code and migration evidence, recording discrepancies rather than silently assuming.

## Environments and release
The repository scan does not prove the current Local/DEV/TEST/UAT/PROD topology or an active CI/CD pipeline. See `docs/project-handbook/deployment/Runbook.md` for proposed gates and information owners must fill in before live release.

## Where to go next
Use the API reference for route families, the test plan/cases/RTM for verification, the migration strategy for schema/data evolution, and incident/runbook documents for operations.
