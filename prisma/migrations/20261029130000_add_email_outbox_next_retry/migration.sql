-- Add nextRetryAt to EmailOutbox for background retry scheduler
ALTER TABLE "EmailOutbox" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3);
