-- CreateTable
CREATE TABLE IF NOT EXISTS "PackageSlugHistory" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "newSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PackageSlugHistory_oldSlug_key" ON "PackageSlugHistory"("oldSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PackageSlugHistory_oldSlug_idx" ON "PackageSlugHistory"("oldSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PackageSlugHistory_seriesId_idx" ON "PackageSlugHistory"("seriesId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PackageSlugHistory_seriesId_fkey'
    ) THEN
        ALTER TABLE "PackageSlugHistory" ADD CONSTRAINT "PackageSlugHistory_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ExamSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
