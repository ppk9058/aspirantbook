-- CreateIndex
CREATE INDEX "CurrentAffairsPdf_status_year_month_idx" ON "CurrentAffairsPdf"("status", "year", "month");

-- CreateIndex
CREATE INDEX "ExamSeriesEnrollment_userId_status_expiresAt_idx" ON "ExamSeriesEnrollment"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Payment_userId_status_createdAt_idx" ON "Payment"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_endDate_idx" ON "Subscription"("userId", "status", "endDate");
