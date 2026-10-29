-- CreateTable
CREATE TABLE "ExamAttemptArchive" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answersBlob" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttemptArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptArchive_attemptId_key" ON "ExamAttemptArchive"("attemptId");

-- CreateIndex
CREATE INDEX "ExamAttemptArchive_testId_idx" ON "ExamAttemptArchive"("testId");

-- CreateIndex
CREATE INDEX "ExamAttemptArchive_userId_idx" ON "ExamAttemptArchive"("userId");

-- CreateIndex
CREATE INDEX "ExamAttemptArchive_submittedAt_idx" ON "ExamAttemptArchive"("submittedAt");

-- AddForeignKey
ALTER TABLE "ExamAttemptArchive" ADD CONSTRAINT "ExamAttemptArchive_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptArchive" ADD CONSTRAINT "ExamAttemptArchive_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ExamTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptArchive" ADD CONSTRAINT "ExamAttemptArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
