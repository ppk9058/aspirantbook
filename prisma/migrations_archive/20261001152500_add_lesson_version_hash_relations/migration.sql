-- AlterTable
ALTER TABLE "LessonVersion" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Lesson_currentPublishedVersionId_idx" ON "Lesson"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "Lesson_currentDraftVersionId_idx" ON "Lesson"("currentDraftVersionId");

-- CreateIndex
CREATE INDEX "LessonVersion_lessonId_createdAt_idx" ON "LessonVersion"("lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonVersion_contentHash_idx" ON "LessonVersion"("contentHash");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "LessonVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_currentDraftVersionId_fkey" FOREIGN KEY ("currentDraftVersionId") REFERENCES "LessonVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
