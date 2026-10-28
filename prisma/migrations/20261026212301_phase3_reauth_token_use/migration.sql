-- CreateTable
CREATE TABLE "ReauthTokenUse" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReauthTokenUse_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "ReauthTokenUse_expiresAt_idx" ON "ReauthTokenUse"("expiresAt");
