-- CreateTable
CREATE TABLE "CourseAnalytics" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "newEnrollments" INTEGER NOT NULL DEFAULT 0,
    "activeLearnersToday" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCompletionTimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTimeSpentHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimePerUserHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "exercisesCompleted" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newReviews" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMinutes" INTEGER NOT NULL DEFAULT 0,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "exercisesCompleted" INTEGER NOT NULL DEFAULT 0,
    "assessmentsTaken" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "achievementsUnlocked" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "coursesEnrolled" INTEGER NOT NULL DEFAULT 0,
    "coursesCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueAnalytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newSubscriptionsRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "renewalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "cancelledSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "activeSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "mrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseAnalytics_courseId_idx" ON "CourseAnalytics"("courseId");

-- CreateIndex
CREATE INDEX "CourseAnalytics_date_idx" ON "CourseAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAnalytics_courseId_date_key" ON "CourseAnalytics"("courseId", "date");

-- CreateIndex
CREATE INDEX "UserAnalytics_userId_idx" ON "UserAnalytics"("userId");

-- CreateIndex
CREATE INDEX "UserAnalytics_date_idx" ON "UserAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnalytics_userId_date_key" ON "UserAnalytics"("userId", "date");

-- CreateIndex
CREATE INDEX "RevenueAnalytics_date_idx" ON "RevenueAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueAnalytics_date_key" ON "RevenueAnalytics"("date");

-- AddForeignKey
ALTER TABLE "CourseAnalytics" ADD CONSTRAINT "CourseAnalytics_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnalytics" ADD CONSTRAINT "UserAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
