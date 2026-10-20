-- AlterTable ExamSeries: add bannerUrl, syllabus, keyFeatures, whyThisSeries
ALTER TABLE "ExamSeries" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "ExamSeries" ADD COLUMN "syllabus" TEXT;
ALTER TABLE "ExamSeries" ADD COLUMN "keyFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ExamSeries" ADD COLUMN "whyThisSeries" TEXT;

-- AlterTable ExamTest: add syllabus, syllabusHi
ALTER TABLE "ExamTest" ADD COLUMN "syllabus" TEXT;
ALTER TABLE "ExamTest" ADD COLUMN "syllabusHi" TEXT;
