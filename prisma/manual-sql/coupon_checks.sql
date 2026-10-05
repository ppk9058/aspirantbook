-- BEGIN COUPON DOMAIN CONSTRAINTS
BEGIN;

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_discount_type"
  CHECK ("discountType" IN ('PERCENT', 'FLAT'));

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_discount_value_positive"
  CHECK ("discountValue" > 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_percent_max"
  CHECK ("discountType" <> 'PERCENT' OR "discountValue" <= 100);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_max_discount"
  CHECK ("maxDiscountAmount" IS NULL OR "maxDiscountAmount" > 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_max_redemptions"
  CHECK ("maxRedemptions" IS NULL OR "maxRedemptions" > 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_per_user_limit"
  CHECK ("perUserLimit" >= 1);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "check_coupon_date_range"
  CHECK ("validFrom" IS NULL OR "validUntil" IS NULL OR "validUntil" > "validFrom");

ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "check_coupon_redemption_status"
  CHECK ("status" IN ('RESERVED', 'REDEEMED', 'RELEASED'));

COMMIT;
