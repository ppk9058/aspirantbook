-- AlterTable Course
ALTER TABLE "Course" ADD COLUMN "isGated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "previewPercentage" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Course" ADD COLUMN "seoMode" TEXT NOT NULL DEFAULT 'preview';
ALTER TABLE "Course" ADD COLUMN "gateTitle" TEXT;
ALTER TABLE "Course" ADD COLUMN "gateSubtitle" TEXT;

-- AlterTable Chapter
ALTER TABLE "Chapter" ADD COLUMN "gateMode" TEXT NOT NULL DEFAULT 'inherit';
ALTER TABLE "Chapter" ADD COLUMN "previewPercentage" INTEGER;

-- AlterTable Lesson
ALTER TABLE "Lesson" ADD COLUMN "gateMode" TEXT NOT NULL DEFAULT 'inherit';
ALTER TABLE "Lesson" ADD COLUMN "previewPercentage" INTEGER;
ALTER TABLE "Lesson" ADD COLUMN "blockCount" INTEGER;
ALTER TABLE "Lesson" ADD COLUMN "contentHash" TEXT;

-- AlterTable ExamSeries
ALTER TABLE "ExamSeries" ADD COLUMN "isGated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExamSeries" ADD COLUMN "previewPercentage" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "ExamSeries" ADD COLUMN "seoMode" TEXT NOT NULL DEFAULT 'preview';
ALTER TABLE "ExamSeries" ADD COLUMN "gateTitle" TEXT;
ALTER TABLE "ExamSeries" ADD COLUMN "gateSubtitle" TEXT;

-- AlterTable ExamTest
ALTER TABLE "ExamTest" ADD COLUMN "gateMode" TEXT NOT NULL DEFAULT 'inherit';
ALTER TABLE "ExamTest" ADD COLUMN "previewPercentage" INTEGER;
ALTER TABLE "ExamTest" ADD COLUMN "blockCount" INTEGER;
ALTER TABLE "ExamTest" ADD COLUMN "contentHash" TEXT;

-- AlterTable PyqPaper
ALTER TABLE "PyqPaper" ADD COLUMN "isGated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PyqPaper" ADD COLUMN "previewPercentage" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "PyqPaper" ADD COLUMN "seoMode" TEXT NOT NULL DEFAULT 'preview';
ALTER TABLE "PyqPaper" ADD COLUMN "gateTitle" TEXT;
ALTER TABLE "PyqPaper" ADD COLUMN "gateSubtitle" TEXT;
ALTER TABLE "PyqPaper" ADD COLUMN "blockCount" INTEGER;
ALTER TABLE "PyqPaper" ADD COLUMN "contentHash" TEXT;

-- AlterTable CurrentAffairsPdf
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "isGated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "previewPercentage" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "seoMode" TEXT NOT NULL DEFAULT 'preview';
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "gateTitle" TEXT;
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "gateSubtitle" TEXT;
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "blockCount" INTEGER;
ALTER TABLE "CurrentAffairsPdf" ADD COLUMN "contentHash" TEXT;
