/*
  Warnings:

  - You are about to drop the column `thumbnail` on the `Course` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "thumbnail",
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "thumbnailUrl" TEXT,
ALTER COLUMN "duration" SET DEFAULT 0,
ALTER COLUMN "technology" SET NOT NULL,
ALTER COLUMN "technology" SET DEFAULT '',
ALTER COLUMN "technology" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");
