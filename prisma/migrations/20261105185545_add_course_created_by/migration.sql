-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "Course_createdById_idx" ON "Course"("createdById");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
