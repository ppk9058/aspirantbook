-- CreateIndex
CREATE INDEX "Book_createdAt_idx" ON "Book"("createdAt");

-- CreateIndex
CREATE INDEX "BookOrder_userId_status_idx" ON "BookOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "BookOrder_createdAt_idx" ON "BookOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ContentEngineQuestion_isPublished_status_createdAt_idx" ON "ContentEngineQuestion"("isPublished", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Course_isPublished_createdAt_idx" ON "Course"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "Doubt_status_createdAt_idx" ON "Doubt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Doubt_subject_createdAt_idx" ON "Doubt"("subject", "createdAt");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_enrolledAt_idx" ON "Enrollment"("courseId", "enrolledAt");

-- CreateIndex
CREATE INDEX "ExamAttempt_userId_startedAt_idx" ON "ExamAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ExamTest_isPublished_isArchived_createdAt_idx" ON "ExamTest"("isPublished", "isArchived", "createdAt");

-- CreateIndex
CREATE INDEX "ExamTest_isPublished_isArchived_order_idx" ON "ExamTest"("isPublished", "isArchived", "order");

-- CreateIndex
CREATE INDEX "FormSubmission_formSlug_submittedAt_idx" ON "FormSubmission"("formSlug", "submittedAt");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_createdAt_idx" ON "Subscription"("createdAt");
