-- CreateEnum
CREATE TYPE "CallbackLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "descriptionHi" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "subtitleHi" TEXT,
ADD COLUMN     "titleHi" TEXT;

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "descriptionHi" TEXT,
ADD COLUMN     "subtopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subtopicsHi" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "titleHi" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "contentHi" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "titleHi" TEXT;

-- CreateTable
CREATE TABLE "CourseUnit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCallbackLead" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "status" "CallbackLeadStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'COURSE_DETAIL',
    "utm" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCallbackLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSyllabusPaper" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "marks" INTEGER,
    "durationMinutes" INTEGER,
    "introText" TEXT,
    "introTextHi" TEXT,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSyllabusPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSyllabusSection" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "subtopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subtopicsHi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "unitId" TEXT,
    "chapterId" TEXT,
    "pyqSubject" TEXT,
    "pyqTopic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSyllabusSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseUnit_courseId_idx" ON "CourseUnit"("courseId");

-- CreateIndex
CREATE INDEX "CourseUnit_order_idx" ON "CourseUnit"("order");

-- CreateIndex
CREATE INDEX "CourseCallbackLead_courseId_idx" ON "CourseCallbackLead"("courseId");

-- CreateIndex
CREATE INDEX "CourseCallbackLead_createdAt_idx" ON "CourseCallbackLead"("createdAt");

-- CreateIndex
CREATE INDEX "CourseCallbackLead_courseId_mobile_createdAt_idx" ON "CourseCallbackLead"("courseId", "mobile", "createdAt");

-- CreateIndex
CREATE INDEX "CourseSyllabusPaper_courseId_idx" ON "CourseSyllabusPaper"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSyllabusPaper_courseId_key_key" ON "CourseSyllabusPaper"("courseId", "key");

-- CreateIndex
CREATE INDEX "CourseSyllabusSection_paperId_idx" ON "CourseSyllabusSection"("paperId");

-- CreateIndex
CREATE INDEX "CourseSyllabusSection_unitId_idx" ON "CourseSyllabusSection"("unitId");

-- CreateIndex
CREATE INDEX "CourseSyllabusSection_chapterId_idx" ON "CourseSyllabusSection"("chapterId");

-- CreateIndex
CREATE INDEX "CourseSyllabusSection_pyqSubject_pyqTopic_idx" ON "CourseSyllabusSection"("pyqSubject", "pyqTopic");

-- CreateIndex
CREATE INDEX "Chapter_unitId_idx" ON "Chapter"("unitId");

-- CreateIndex
CREATE INDEX "Lesson_scheduledAt_idx" ON "Lesson"("scheduledAt");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "CourseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseUnit" ADD CONSTRAINT "CourseUnit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCallbackLead" ADD CONSTRAINT "CourseCallbackLead_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCallbackLead" ADD CONSTRAINT "CourseCallbackLead_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabusPaper" ADD CONSTRAINT "CourseSyllabusPaper_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabusSection" ADD CONSTRAINT "CourseSyllabusSection_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "CourseSyllabusPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabusSection" ADD CONSTRAINT "CourseSyllabusSection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "CourseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSyllabusSection" ADD CONSTRAINT "CourseSyllabusSection_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

