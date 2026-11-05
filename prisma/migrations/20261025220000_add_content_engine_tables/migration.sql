-- CreateTable
CREATE TABLE "ContentEngineBatch" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "pastedText" TEXT NOT NULL,
    "defaultSubject" TEXT,
    "defaultTopic" TEXT,
    "defaultExam" TEXT,
    "defaultYear" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEngineQuestion" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "answerIndex" INTEGER NOT NULL DEFAULT -1,
    "explanation" TEXT,
    "sub" TEXT,
    "top" TEXT,
    "exam" TEXT,
    "year" TEXT,
    "sourceTag" TEXT,
    "sourceNo" INTEGER,
    "batchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isInferred" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEngineTranslation" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" TEXT,
    "explanation" TEXT,
    "top" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEngineCategoryOverride" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "top" TEXT NOT NULL,
    "subHi" TEXT,
    "topHi" TEXT,
    "exam" TEXT,
    "year" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineCategoryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEngineExamAlias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineExamAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEngineSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEngineSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentEngineBatch_createdById_idx" ON "ContentEngineBatch"("createdById");

-- CreateIndex
CREATE INDEX "ContentEngineBatch_createdAt_idx" ON "ContentEngineBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEngineQuestion_shortId_key" ON "ContentEngineQuestion"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEngineQuestion_textHash_key" ON "ContentEngineQuestion"("textHash");

-- CreateIndex
CREATE INDEX "ContentEngineQuestion_batchId_idx" ON "ContentEngineQuestion"("batchId");

-- CreateIndex
CREATE INDEX "ContentEngineQuestion_isPublished_idx" ON "ContentEngineQuestion"("isPublished");

-- CreateIndex
CREATE INDEX "ContentEngineQuestion_sub_top_idx" ON "ContentEngineQuestion"("sub", "top");

-- CreateIndex
CREATE INDEX "ContentEngineQuestion_exam_year_idx" ON "ContentEngineQuestion"("exam", "year");

-- CreateIndex
CREATE INDEX "ContentEngineQuestion_createdAt_idx" ON "ContentEngineQuestion"("createdAt");

-- CreateIndex
CREATE INDEX "ContentEngineTranslation_questionId_idx" ON "ContentEngineTranslation"("questionId");

-- CreateIndex
CREATE INDEX "ContentEngineTranslation_lang_isReviewed_idx" ON "ContentEngineTranslation"("lang", "isReviewed");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEngineTranslation_questionId_lang_key" ON "ContentEngineTranslation"("questionId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEngineCategoryOverride_questionId_key" ON "ContentEngineCategoryOverride"("questionId");

-- CreateIndex
CREATE INDEX "ContentEngineCategoryOverride_questionId_idx" ON "ContentEngineCategoryOverride"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEngineExamAlias_name_key" ON "ContentEngineExamAlias"("name");

-- CreateIndex
CREATE INDEX "ContentEngineExamAlias_isEnabled_idx" ON "ContentEngineExamAlias"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEngineSetting_key_key" ON "ContentEngineSetting"("key");

-- AddForeignKey
ALTER TABLE "ContentEngineQuestion" ADD CONSTRAINT "ContentEngineQuestion_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ContentEngineBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEngineTranslation" ADD CONSTRAINT "ContentEngineTranslation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ContentEngineQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEngineCategoryOverride" ADD CONSTRAINT "ContentEngineCategoryOverride_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ContentEngineQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
