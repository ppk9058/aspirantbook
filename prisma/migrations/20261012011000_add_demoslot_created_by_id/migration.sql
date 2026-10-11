-- AlterTable
ALTER TABLE "DemoSlot" ADD COLUMN "createdById" TEXT;

-- CreateIndex
CREATE INDEX "DemoSlot_createdById_idx" ON "DemoSlot"("createdById");

-- AddForeignKey
ALTER TABLE "DemoSlot" ADD CONSTRAINT "DemoSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
