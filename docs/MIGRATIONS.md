# Database Migration Baseline & Workflow Standards

## 1. Baseline Architecture
- The database baseline is locked at `prisma/migrations/0_baseline/migration.sql`.
- The live schema exactly mirrors `prisma/schema.prisma`.
- Historical untracked migration attempts are archived under `prisma/migrations_archive/`.
- Ad-hoc scripts in `prisma/manual-sql/` are officially retired; all future DDL must follow the automated Prisma migration workflow.

## 2. Development & Deployment Workflow
1. **Local Development (Docker Test DB)**:
   - Ensure local PostgreSQL Docker container is running (`npm run test:db:up`).
   - Run `npx prisma migrate dev --name <migration_name>` against the local test database.
   - Run test suites on the local test database to verify constraints and relationships.
2. **Production / Staging Deployment**:
   - Run `npx prisma migrate deploy` on the target database.
   - Do not use `prisma db push` on staging or production databases.
3. **CHECK Constraints**:
   - PostgreSQL domain / CHECK constraints that cannot be expressed directly in Prisma DSL are maintained in dedicated migration SQL files applied via migrations.
