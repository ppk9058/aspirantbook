-- Drop redundant composite unique index (covered by CouponRedemption_paymentId_key)
DROP INDEX IF EXISTS "CouponRedemption_couponId_userId_paymentId_key";
