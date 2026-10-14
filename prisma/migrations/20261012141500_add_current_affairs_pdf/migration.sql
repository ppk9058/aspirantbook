-- AlterEnum
ALTER TYPE "ExamTestType" ADD VALUE 'CURRENT_AFFAIRS';

-- AlterTable
ALTER TABLE "ExamTest" ADD COLUMN "month" INTEGER,
ADD COLUMN "year" INTEGER;

-- CreateIndex
CREATE INDEX "ExamTest_year_month_idx" ON "ExamTest"("year", "month");

-- CreateTable
CREATE TABLE "CurrentAffairsPdf" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "pdfUrlEn" TEXT,
    "pdfUrlHi" TEXT,
    "fileSizeKbEn" INTEGER,
    "fileSizeKbHi" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentAffairsPdf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurrentAffairsPdf_year_month_idx" ON "CurrentAffairsPdf"("year", "month");

-- CreateIndex
CREATE INDEX "CurrentAffairsPdf_status_idx" ON "CurrentAffairsPdf"("status");

-- CreateIndex
CREATE INDEX "CurrentAffairsPdf_createdById_idx" ON "CurrentAffairsPdf"("createdById");

-- AddForeignKey
ALTER TABLE "CurrentAffairsPdf" ADD CONSTRAINT "CurrentAffairsPdf_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
