/*
  Warnings:

  - You are about to drop the column `provider` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "provider",
DROP COLUMN "providerId",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'USD';

-- CreateTable
CREATE TABLE "ContentUpload" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "fileUrl" TEXT NOT NULL,
    "s3Key" TEXT,
    "cdnUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "processingProgress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "associatedCourseId" TEXT,
    "associatedChapterId" TEXT,
    "uploadStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadCompletedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),

    CONSTRAINT "ContentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentUpload_uploadedBy_idx" ON "ContentUpload"("uploadedBy");

-- CreateIndex
CREATE INDEX "ContentUpload_associatedCourseId_idx" ON "ContentUpload"("associatedCourseId");

-- CreateIndex
CREATE INDEX "ContentUpload_status_idx" ON "ContentUpload"("status");

-- CreateIndex
CREATE INDEX "ContentUpload_contentType_idx" ON "ContentUpload"("contentType");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentUpload" ADD CONSTRAINT "ContentUpload_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentUpload" ADD CONSTRAINT "ContentUpload_associatedCourseId_fkey" FOREIGN KEY ("associatedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentUpload" ADD CONSTRAINT "ContentUpload_associatedChapterId_fkey" FOREIGN KEY ("associatedChapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
