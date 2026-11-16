-- AlterTable (Phase 2 structured solutions — additive only)
ALTER TABLE "ContentEngineQuestion" ADD COLUMN "solution" JSONB,
ADD COLUMN "solutionSource" TEXT,
ADD COLUMN "solutionVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ContentEngineTranslation" ADD COLUMN "solution" JSONB;
