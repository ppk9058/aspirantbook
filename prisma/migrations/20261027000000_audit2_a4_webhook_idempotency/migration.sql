-- A4: Stripe webhook idempotency + money minor units
-- Additive only: nullable column, new table, new indexes.

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "amountMinor" INTEGER;

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerId_key" ON "Subscription"("providerId");
