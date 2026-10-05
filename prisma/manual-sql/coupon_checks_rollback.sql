-- ROLLBACK COUPON DOMAIN CONSTRAINTS
BEGIN;

ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_discount_type";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_discount_value_positive";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_percent_max";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_max_discount";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_max_redemptions";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_per_user_limit";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "check_coupon_date_range";
ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "check_coupon_redemption_status";

COMMIT;
