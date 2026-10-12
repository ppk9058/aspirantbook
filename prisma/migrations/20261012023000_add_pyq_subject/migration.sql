-- AlterTable
ALTER TABLE "PyqPaper" ADD COLUMN "subject" TEXT;

-- CreateIndex
CREATE INDEX "PyqPaper_subject_idx" ON "PyqPaper"("subject");
