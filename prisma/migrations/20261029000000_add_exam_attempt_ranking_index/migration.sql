-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_examattempt_ranking" ON "ExamAttempt"("testId", "score" DESC, "timeTakenSecs" ASC, "submittedAt" ASC);
