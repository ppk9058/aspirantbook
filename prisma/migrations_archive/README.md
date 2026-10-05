# Historical Migrations Archive

The migration folders archived here (`20251123234957_init`, `20251124001225_add_course_status`, etc.) represent the historical Prisma migration drafts.

They were never formally tracked or applied on the live Supabase development database (where `_prisma_migrations` was uninitialized).

The authoritative database baseline is captured in `prisma/migrations/0_baseline/migration.sql`, which matches the live database schema exactly.
