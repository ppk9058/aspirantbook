-- A13: refresh-token rotation without a new DeviceSession row per refresh.
-- Additive only: one nullable column plus its index. Existing rows keep
-- working (previousRefreshTokenHash = NULL means "no previous generation").
ALTER TABLE "DeviceSession" ADD COLUMN "previousRefreshTokenHash" TEXT;

CREATE INDEX "DeviceSession_previousRefreshTokenHash_idx"
  ON "DeviceSession"("previousRefreshTokenHash");
