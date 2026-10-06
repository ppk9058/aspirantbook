-- Drop the previous JSON-expression indexes if they exist
DROP INDEX IF EXISTS "idx_payment_razorpay_order_id";
DROP INDEX IF EXISTS "idx_payment_razorpay_payment_id";

-- Add real columns razorpayOrderId and razorpayPaymentId to Payment table
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;

-- Populate existing rows from metadata if available
UPDATE "Payment" 
SET "razorpayOrderId" = metadata->>'orderId' 
WHERE "razorpayOrderId" IS NULL AND metadata->>'orderId' IS NOT NULL;

UPDATE "Payment" 
SET "razorpayPaymentId" = metadata->>'paymentId' 
WHERE "razorpayPaymentId" IS NULL AND metadata->>'paymentId' IS NOT NULL;

-- Create unique indexes on the new columns
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");
