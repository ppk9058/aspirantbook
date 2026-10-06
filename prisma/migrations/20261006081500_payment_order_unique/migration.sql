-- Additive migration: unique partial indexes on Payment for Razorpay order ID and payment ID
-- Stored in metadata: {"orderId": "..."} and externalId / metadata->'paymentId'

-- 1. Unique index on metadata->>'orderId' for non-null orderId to ensure exactly 1 Payment row per Razorpay order
CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_razorpay_order_id" 
ON "Payment" ((metadata->>'orderId')) 
WHERE (metadata->>'orderId') IS NOT NULL;

-- 2. Unique index on metadata->>'paymentId' for non-null paymentId
CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_razorpay_payment_id" 
ON "Payment" ((metadata->>'paymentId')) 
WHERE (metadata->>'paymentId') IS NOT NULL;
