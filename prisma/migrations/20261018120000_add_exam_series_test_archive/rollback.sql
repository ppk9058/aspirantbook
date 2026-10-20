-- Rollback for 20261018120000_add_exam_series_test_archive

-- DropIndex
DROP INDEX IF EXISTS "ExamTest_isArchived_idx";
DROP INDEX IF EXISTS "ExamSeries_isArchived_idx";

-- AlterTable ExamTest
ALTER TABLE "ExamTest" DROP COLUMN IF EXISTS "archivedAt";
ALTER TABLE "ExamTest" DROP COLUMN IF EXISTS "isArchived";

-- AlterTable ExamSeries
ALTER TABLE "ExamSeries" DROP COLUMN IF EXISTS "archivedAt";
ALTER TABLE "ExamSeries" DROP COLUMN IF EXISTS "isArchived";
