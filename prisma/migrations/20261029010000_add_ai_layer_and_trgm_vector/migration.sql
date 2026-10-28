-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create GIN trigram indexes for fast ILIKE searches
CREATE INDEX IF NOT EXISTS "Course_title_trgm_idx" ON "Course" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_description_trgm_idx" ON "Course" USING gin ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ExamSeries_title_trgm_idx" ON "ExamSeries" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ExamSeries_category_trgm_idx" ON "ExamSeries" USING gin ("category" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ExamTest_title_trgm_idx" ON "ExamTest" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CurrentAffairsPdf_title_trgm_idx" ON "CurrentAffairsPdf" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CurrentAffairsPdf_titleHi_trgm_idx" ON "CurrentAffairsPdf" USING gin ("titleHi" gin_trgm_ops);

-- CreateTable AiCache
CREATE TABLE IF NOT EXISTS "AiCache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "inputText" TEXT NOT NULL,
    "outputText" TEXT NOT NULL,
    "metadata" JSONB,
    "modelUsed" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiRateLimitCounter
CREATE TABLE IF NOT EXISTS "AiRateLimitCounter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "windowType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRateLimitCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiStudentQuota
CREATE TABLE IF NOT EXISTS "AiStudentQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayDate" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiStudentQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiBatchJob
CREATE TABLE IF NOT EXISTS "AiBatchJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiBatchItem
CREATE TABLE IF NOT EXISTS "AiBatchItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "referenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "editedOutput" JSONB,
    "error" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiContentEmbedding
CREATE TABLE IF NOT EXISTS "AiContentEmbedding" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiContentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiCache_key_key" ON "AiCache"("key");
CREATE INDEX IF NOT EXISTS "AiCache_task_language_idx" ON "AiCache"("task", "language");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiRateLimitCounter_key_key" ON "AiRateLimitCounter"("key");
CREATE INDEX IF NOT EXISTS "AiRateLimitCounter_provider_windowType_idx" ON "AiRateLimitCounter"("provider", "windowType");
CREATE INDEX IF NOT EXISTS "AiRateLimitCounter_expiresAt_idx" ON "AiRateLimitCounter"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AiStudentQuota_userId_dayDate_key" ON "AiStudentQuota"("userId", "dayDate");
CREATE INDEX IF NOT EXISTS "AiStudentQuota_userId_idx" ON "AiStudentQuota"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiBatchJob_status_idx" ON "AiBatchJob"("status");
CREATE INDEX IF NOT EXISTS "AiBatchJob_jobType_idx" ON "AiBatchJob"("jobType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiBatchItem_jobId_status_idx" ON "AiBatchItem"("jobId", "status");
CREATE INDEX IF NOT EXISTS "AiBatchItem_referenceId_idx" ON "AiBatchItem"("referenceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiContentEmbedding_contentType_contentId_idx" ON "AiContentEmbedding"("contentType", "contentId");

-- AddForeignKey
ALTER TABLE "AiBatchItem" DROP CONSTRAINT IF EXISTS "AiBatchItem_jobId_fkey";
ALTER TABLE "AiBatchItem" ADD CONSTRAINT "AiBatchItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiBatchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
