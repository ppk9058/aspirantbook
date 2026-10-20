-- AlterTable ExamSeries
ALTER TABLE "ExamSeries" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExamSeries" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable ExamTest
ALTER TABLE "ExamTest" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExamTest" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ExamSeries_isArchived_idx" ON "ExamSeries"("isArchived");

-- CreateIndex
CREATE INDEX "ExamTest_isArchived_idx" ON "ExamTest"("isArchived");
