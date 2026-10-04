# Generated project map
Generated on 2026-10-02. Facts extracted by script. Re-run after structural changes.

## 1. package.json (name, scripts, dependencies)
name: aspirantbook
scripts: {
 "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev",
 "build": "next build",
 "start": "next start",
 "lint": "next lint",
 "postinstall": "prisma generate"
}
dependencies: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @google/generative-ai, @hello-pangea/dnd, @hookform/resolvers, @monaco-editor/react, @prisma/client, @radix-ui/react-accordion, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-label, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-select, @radix-ui/react-slider, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toast, @stripe/stripe-js, @tanstack/react-query, @trpc/client, @trpc/next, @trpc/react-query, @trpc/server, @types/dockerode, @types/ioredis, @types/katex, axios, bcryptjs, class-variance-authority, clsx, cmdk, date-fns, dockerode, framer-motion, ioredis, katex, lucide-react, next, next-auth, pdfjs-dist, razorpay, react, react-circular-progressbar, react-dom, react-hook-form, react-pdf, react-player, react-resizable-panels, recharts, sonner, stripe, superjson, swiper, tailwind-merge, tailwindcss-animate, zod
devDependencies: @tailwindcss/postcss, @types/bcryptjs, @types/dompurify, @types/node, @types/react, @types/react-dom, eslint, eslint-config-next, playwright-core, prisma, tailwindcss, tsx, typescript

## 2. Top-level files and folders
AGENTS.md
README.md
app
audit
auth.config.ts
auth.ts
components
components.json
data
digest.txt
docker
docs
eslint.config.mjs
lib
middleware.ts
next-env.d.ts
next.config.js
package-lock.json
package.json
postcss.config.mjs
prisma
public
scripts
server.log
tailwind.config.ts
tsconfig.json
tsconfig.tsbuildinfo
types

## 3. Routes (pages, layouts, route handlers, loading/error)
./app/(auth)/login/page.tsx
./app/(auth)/register/page.tsx
./app/(dashboard)/admin/test-series/create/page.tsx
./app/(dashboard)/admin/test-series/page.tsx
./app/(dashboard)/assessments/[id]/page.tsx
./app/(dashboard)/assessments/[id]/results/page.tsx
./app/(dashboard)/assessments/[id]/take/page.tsx
./app/(dashboard)/assessments/page.tsx
./app/(dashboard)/books/[slug]/page.tsx
./app/(dashboard)/books/cart/page.tsx
./app/(dashboard)/books/orders/page.tsx
./app/(dashboard)/books/page.tsx
./app/(dashboard)/code-along/page.tsx
./app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx
./app/(dashboard)/courses/[slug]/page.tsx
./app/(dashboard)/courses/loading.tsx
./app/(dashboard)/courses/page.tsx
./app/(dashboard)/current-affairs-quizzes/page.tsx
./app/(dashboard)/dashboard/page.tsx
./app/(dashboard)/doubts/page.tsx
./app/(dashboard)/forms/[slug]/page.tsx
./app/(dashboard)/forms/page.tsx
./app/(dashboard)/layout.tsx
./app/(dashboard)/leaderboard/page.tsx
./app/(dashboard)/learn/[courseSlug]/[lessonId]/page.tsx
./app/(dashboard)/learn/[courseSlug]/page.tsx
./app/(dashboard)/learn/page.tsx
./app/(dashboard)/loading.tsx
./app/(dashboard)/my-learning/page.tsx
./app/(dashboard)/practice/page.tsx
./app/(dashboard)/practice/runner/page.tsx
./app/(dashboard)/profile/page.tsx
./app/(dashboard)/projects/page.tsx
./app/(dashboard)/purchases/page.tsx
./app/(dashboard)/pyqs/[examId]/page.tsx
./app/(dashboard)/pyqs/page.tsx
./app/(dashboard)/pyqs/pdf-view/page.tsx
./app/(dashboard)/search/loading.tsx
./app/(dashboard)/search/page.tsx
./app/(dashboard)/settings/page.tsx
./app/(dashboard)/settings/subscription/page.tsx
./app/(dashboard)/subscription/page.tsx
./app/(dashboard)/teacher/classes/new/page.tsx
./app/(dashboard)/teacher/classes/page.tsx
./app/(dashboard)/teacher/page.tsx
./app/(dashboard)/teacher/pyqs/page.tsx
./app/(dashboard)/teacher/questions/page.tsx
./app/(dashboard)/teacher/test-series/[testId]/submissions/page.tsx
./app/(dashboard)/teacher/test-series/create/page.tsx
./app/(dashboard)/teacher/test-series/page.tsx
./app/(dashboard)/teacher/tests/new/page.tsx
./app/(dashboard)/test-series/[id]/leaderboard/page.tsx
./app/(dashboard)/test-series/[id]/page.tsx
./app/(dashboard)/test-series/my-tests/page.tsx
./app/(dashboard)/test-series/page.tsx
./app/(dashboard)/tracks/[slug]/page.tsx
./app/(dashboard)/tracks/career/[slug]/page.tsx
./app/(dashboard)/tracks/career/loading.tsx
./app/(dashboard)/tracks/career/page.tsx
./app/(dashboard)/tracks/page.tsx
./app/(dashboard)/tracks/skills/page.tsx
./app/(dashboard)/tutorials/page.tsx
./app/(exam)/layout.tsx
./app/(exam)/test-series/[id]/attempt/page.tsx
./app/(exam)/test-series/[id]/declaration/page.tsx
./app/(exam)/test-series/[id]/instructions/page.tsx
./app/(exam)/test-series/[id]/print/page.tsx
./app/(exam)/test-series/[id]/result/page.tsx
./app/(exam)/test-series/[id]/solutions/page.tsx
./app/admin/analytics/page.tsx
./app/admin/assessments/[id]/attempts/page.tsx
./app/admin/assessments/[id]/edit/page.tsx
./app/admin/assessments/create/page.tsx
./app/admin/assessments/page.tsx
./app/admin/audit/page.tsx
./app/admin/batches/[id]/edit/page.tsx
./app/admin/batches/new/page.tsx
./app/admin/batches/page.tsx
./app/admin/books/page.tsx
./app/admin/courses/[id]/edit/page.tsx
./app/admin/courses/new/page.tsx
./app/admin/courses/page.tsx
./app/admin/dashboard/page.tsx
./app/admin/exercises/[id]/edit/page.tsx
./app/admin/exercises/create/page.tsx
./app/admin/exercises/page.tsx
./app/admin/homepage-cards/page.tsx
./app/admin/layout.tsx
./app/admin/page.tsx
./app/admin/pyqs/categories/page.tsx
./app/admin/pyqs/leads/page.tsx
./app/admin/pyqs/page.tsx
./app/admin/pyqs/upload/page.tsx
./app/admin/settings/page.tsx
./app/admin/tracks/[id]/page.tsx
./app/admin/tracks/create/page.tsx
./app/admin/tracks/page.tsx
./app/admin/tutorials/[id]/edit/page.tsx
./app/admin/tutorials/new/page.tsx
./app/admin/tutorials/page.tsx
./app/admin/users/[id]/page.tsx
./app/admin/users/page.tsx
./app/api/admin/audit/route.ts
./app/api/admin/batches/[id]/route.ts
./app/api/admin/batches/route.ts
./app/api/admin/books/[id]/route.ts
./app/api/admin/books/coupons/route.ts
./app/api/admin/books/orders/route.ts
./app/api/admin/books/route.ts
./app/api/admin/books/stats/route.ts
./app/api/admin/courses/[id]/chapters/route.ts
./app/api/admin/courses/[id]/lessons/route.ts
./app/api/admin/courses/[id]/route.ts
./app/api/admin/courses/route.ts
./app/api/admin/courses/upload/route.ts
./app/api/admin/homepage-cards/route.ts
./app/api/admin/pyqs/categories/[id]/route.ts
./app/api/admin/pyqs/categories/route.ts
./app/api/admin/pyqs/leads/route.ts
./app/api/admin/pyqs/papers/[id]/route.ts
./app/api/admin/pyqs/papers/route.ts
./app/api/admin/pyqs/sub-exams/[id]/route.ts
./app/api/admin/pyqs/sub-exams/route.ts
./app/api/admin/pyqs/upload/route.ts
./app/api/admin/run-analytics/route.ts
./app/api/admin/tutorials/import/route.ts
./app/api/assessments/[id]/start/route.ts
./app/api/assessments/attempts/[attemptId]/submit/route.ts
./app/api/auth/[...nextauth]/route.ts
./app/api/auth/logout/route.ts
./app/api/auth/mobile-login/route.ts
./app/api/auth/role/route.ts
./app/api/books/orders/route.ts
./app/api/books/route.ts
./app/api/checkout/course-info/route.ts
./app/api/checkout/razorpay/route.ts
./app/api/checkout/route.ts
./app/api/classroom/[id]/authorize/route.ts
./app/api/classroom/[id]/chat/route.ts
./app/api/classroom/[id]/hand-raise/route.ts
./app/api/classroom/[id]/notes/route.ts
./app/api/classroom/[id]/participants/route.ts
./app/api/classroom/[id]/polls/route.ts
./app/api/classroom/[id]/questions/route.ts
./app/api/classroom/[id]/route.ts
./app/api/classroom/[id]/settings/route.ts
./app/api/classroom/[id]/teacher/route.ts
./app/api/classroom/live-status/route.ts
./app/api/courses/enroll/route.ts
./app/api/courses/teacher-photo-upload/route.ts
./app/api/courses/video-courses/route.ts
./app/api/doubts/route.ts
./app/api/exam/[testId]/leaderboard/route.ts
./app/api/exam/[testId]/questions/route.ts
./app/api/exam/ai-parse/route.ts
./app/api/exam/attempt/[attemptId]/result/route.ts
./app/api/exam/attempt/[attemptId]/submit/route.ts
./app/api/exam/attempt/[attemptId]/sync/route.ts
./app/api/exam/attempt/start/route.ts
./app/api/exam/series/create/route.ts
./app/api/exam/series/list/route.ts
./app/api/exam/test/create/route.ts
./app/api/exam/test/list/route.ts
./app/api/exam/test/sync-local/route.ts
./app/api/execute/route.ts
./app/api/forms/route.ts
./app/api/goals/route.ts
./app/api/leaderboard/route.ts
./app/api/upload/presigned-url/route.ts
./app/api/upload/route.ts
./app/api/user/goal/route.ts
./app/api/verify-payment/razorpay/route.ts
./app/api/webhooks/razorpay/route.ts
./app/api/webhooks/stripe/route.ts
./app/batches/[slug]/page.tsx
./app/checkout/page.tsx
./app/classroom/[id]/page.tsx
./app/layout.tsx
./app/loading.tsx
./app/page.tsx
./app/pricing/page.tsx

## 4. Components (by folder)
./components/admin/AdminHeader.tsx
./components/admin/AdminNav.tsx
./components/admin/AdminProfileDialog.tsx
./components/admin/BatchForm.tsx
./components/admin/ChapterEditor.tsx
./components/admin/ChapterList.tsx
./components/admin/LessonEditor.tsx
./components/admin/PublishButton.tsx
./components/admin/SubscriptionManagement.tsx
./components/admin/SubscriptionStatusBadge.tsx
./components/admin/UserRoleBadge.tsx
./components/admin/assessment/QuestionEditor.tsx
./components/admin/books/CreateBookModal.tsx
./components/admin/books/CreateCouponModal.tsx
./components/admin/books/EditBookModal.tsx
./components/admin/books/OnlineBookstoreClient.tsx
./components/admin/books/OrderDetailsModal.tsx
./components/admin/courses/VideoCourseEditorClient.tsx
./components/admin/exercise/TestCaseEditor.tsx
./components/admin/homepage-cards/HomePageCardStudioClient.tsx
./components/admin/pyqs/ExamCategoriesManagerClient.tsx
./components/admin/pyqs/PyqPapersListClient.tsx
./components/admin/pyqs/PyqUploadStudioClient.tsx
./components/admin/tracks/TrackCourseManager.tsx
./components/admin/tracks/TrackForm.tsx
./components/assessment/AssessmentInterface.tsx
./components/assessment/AssessmentOverview.tsx
./components/assessment/AssessmentResults.tsx
./components/assessment/CodeQuestion.tsx
./components/assessment/FillBlankQuestion.tsx
./components/assessment/MCQQuestion.tsx
./components/assessment/OutputQuestion.tsx
./components/auth/LoginForm.tsx
./components/auth/MobileAuthContext.tsx
./components/auth/MobileAuthModal.tsx
./components/auth/RegisterForm.tsx
./components/books/BookCard.tsx
./components/books/BookStoreHeader.tsx
./components/books/CartDrawer.tsx
./components/books/EBookReaderModal.tsx
./components/classroom/ChatPanel.tsx
./components/classroom/ClassCompletionSummary.tsx
./components/classroom/ClassHeader.tsx
./components/classroom/ClassroomPanel.tsx
./components/classroom/LiveAssessmentPanel.tsx
./components/classroom/LiveClassroomClient.tsx
./components/classroom/MeetingControlBar.tsx
./components/classroom/MeetingTopBar.tsx
./components/classroom/NotesPanel.tsx
./components/classroom/ParticipantsPanel.tsx
./components/classroom/PollPanel.tsx
./components/classroom/PreJoinScreen.tsx
./components/classroom/QuestionPanel.tsx
./components/classroom/ReconnectionOverlay.tsx
./components/classroom/ReplayTimeline.tsx
./components/classroom/ResourcePanel.tsx
./components/classroom/TeacherControlBar.tsx
./components/classroom/TeacherPollModal.tsx
./components/classroom/TeacherScheduleModal.tsx
./components/classroom/TeacherStage.tsx
./components/classroom/TeacherStudio.tsx
./components/classroom/VideoClassroomStage.tsx
./components/classroom/VideoPlayerStage.tsx
./components/classroom/VideoTile.tsx
./components/classroom/WaitingRoom.tsx
./components/classroom/WhiteboardCanvas.tsx
./components/common/CuriousNavbar.tsx
./components/common/RoleSwitcher.tsx
./components/course/ChatExercise.tsx
./components/course/CodingExercise.tsx
./components/course/ContentTabs.tsx
./components/course/CourseBundleView.tsx
./components/course/CourseComingSoonView.tsx
./components/course/CourseHeader.tsx
./components/course/CoursePlayerClient.tsx
./components/course/CourseTeachersSection.tsx
./components/course/EnhancedVideoPlayer.tsx
./components/course/LaurelSealEmblem.tsx
./components/course/LessonSidebar.tsx
./components/course/VideoPlayer.tsx
./components/courses/CourseCard.tsx
./components/courses/CourseClient.tsx
./components/courses/CourseDocumentTabs.tsx
./components/courses/CourseTabs.tsx
./components/courses/EnrollButton.tsx
./components/courses/FilterSidebar.tsx
./components/courses/SearchBar.tsx
./components/dashboard/AchievementShowcase.tsx
./components/dashboard/ActivityFeed.tsx
./components/dashboard/ContinueLearning.tsx
./components/dashboard/DailyGoalCard.tsx
./components/dashboard/ProgressCharts.tsx
./components/dashboard/QuickActions.tsx
./components/dashboard/RecommendedCourses.tsx
./components/dashboard/StatsCards.tsx
./components/dashboard/StreakCalendar.tsx
./components/dashboard/StudentDashboardClient.tsx
./components/dashboard/WelcomeBanner.tsx
./components/dashboard/mobile/MobileLivePill.tsx
./components/dashboard/mobile/MobilePromoCarousel.tsx
./components/dashboard/mobile/MobileQuickAccessGrid.tsx
./components/dashboard/mobile/MobileRecommendedSection.tsx
./components/editor/AspirantbookTutorialView.tsx
./components/editor/CodecademyContentRenderer.tsx
./components/editor/ContextToolbar.tsx
./components/editor/EditableInlineField.tsx
./components/editor/LazyMonacoEditor.tsx
./components/editor/LessonBlockEditor.tsx
./components/editor/RichContentEditor.tsx
./components/editor/RoseraEditor.tsx
./components/editor/RoseraModernReader.tsx
./components/editor/RoseraRenderer.tsx
./components/editor/TutorialImportModal.tsx
./components/editor/TutorialStudioImportButton.tsx
./components/editor/UniversalEditor.tsx
./components/editor/rosera.css
./components/exam/CreateSeriesModal.tsx
./components/exam/MathRenderer.tsx
./components/exercise/CodeEditor.tsx
./components/home/BatchCardItem.tsx
./components/home/BatchEnrollModal.tsx
./components/home/ClassesCoursesSection.tsx
./components/home/ClassesTabsClient.tsx
./components/home/HomeHeaderUserCTA.tsx
./components/home/HomeUserDropdown.tsx
./components/home/homepage-courses.data.ts
./components/layout/BackButton.tsx
./components/layout/BottomNavBar.tsx
./components/layout/Breadcrumbs.tsx
./components/layout/Chatbot.tsx
./components/layout/DashboardShell.tsx
./components/layout/GoalIcon.tsx
./components/layout/GoalModal.tsx
./components/layout/GoalSelectorButton.tsx
./components/layout/LeftSidebar.tsx
./components/layout/MobileAppHeader.tsx
./components/layout/MobileDrawer.tsx
./components/layout/MobileNativeBottomBar.tsx
./components/layout/MobileProfileSheet.tsx
./components/layout/TopNavBar.tsx
./components/learn/LessonSidebar.tsx
./components/learn/LessonViewer.tsx
./components/learn/ScrollTracker.tsx
./components/learn/VideoPlayer.tsx
./components/learning/MyLearningClient.tsx
./components/practice/CodingPracticeView.tsx
./components/practice/EditorPanel.tsx
./components/practice/ExecutionPanel.tsx
./components/practice/InstructionsPanel.tsx
./components/practice/PracticeEnvironment.tsx
./components/practice/PracticeLayout.tsx
./components/practice/ResizableLayout.tsx
./components/practice/TestRunnerPanel.tsx
./components/providers/GoalProvider.tsx
./components/providers/ThemeProvider.tsx
./components/quizzes/CurrentAffairsQuizzesClient.tsx
./components/student/DoubtSubmissionModal.tsx
./components/student/MyPurchasesClient.tsx
./components/track/LearningPath.tsx
./components/track/TrackCard.tsx
./components/ui/badge.tsx
./components/ui/button.tsx
./components/ui/card.tsx
./components/ui/checkbox.tsx
./components/ui/circular-progress.tsx
./components/ui/command.tsx
./components/ui/dialog.tsx
./components/ui/dropdown-menu.tsx
./components/ui/form.tsx
./components/ui/image-upload.tsx
./components/ui/input.tsx
./components/ui/label.tsx
./components/ui/progress.tsx
./components/ui/radio-group.tsx
./components/ui/scroll-area.tsx
./components/ui/select.tsx
./components/ui/skeleton.tsx
./components/ui/slider.tsx
./components/ui/switch.tsx
./components/ui/tabs.tsx
./components/ui/textarea.tsx
./components/ui/video-upload.tsx

## 5. lib/ files
./lib/.DS_Store
./lib/actions/admin/analytics.ts
./lib/actions/admin/assessments.ts
./lib/actions/admin/audit.ts
./lib/actions/admin/chapters.ts
./lib/actions/admin/course-metadata.ts
./lib/actions/admin/courses.ts
./lib/actions/admin/exercises.ts
./lib/actions/admin/lessons.ts
./lib/actions/admin/profile.ts
./lib/actions/admin/publishing.ts
./lib/actions/admin/settings.ts
./lib/actions/admin/tracks.ts
./lib/actions/admin/tutorial-import.ts
./lib/actions/admin/users.ts
./lib/actions/auth.ts
./lib/actions/course/enrollment.ts
./lib/actions/course/progress.ts
./lib/actions/gamification.ts
./lib/actions/payment/razorpay.ts
./lib/actions/payment/stripe.ts
./lib/actions/tracks/career.ts
./lib/actions/user/profile.ts
./lib/actions/user/subscription.ts
./lib/assessments-data.ts
./lib/audit/audit-logger.ts
./lib/auth-client.ts
./lib/auth/entitlements.ts
./lib/auth/permissions.ts
./lib/auth/rbac.ts
./lib/auth/roles.ts
./lib/aws-s3.ts
./lib/batches-service.ts
./lib/books/bookService.ts
./lib/books/cartContext.tsx
./lib/books/data.ts
./lib/books/types.ts
./lib/classroom-service.ts
./lib/coding-practice-data.ts
./lib/config/mobile-shell.ts
./lib/course-classifier.ts
./lib/design-tokens.ts
./lib/doubts-service.ts
./lib/exam-idb.ts
./lib/execution/piston.ts
./lib/execution/validator.ts
./lib/forms-config.ts
./lib/forms-service.ts
./lib/goal-courses-data.ts
./lib/homepage-cards-service.ts
./lib/payments/razorpay.ts
./lib/payments/stripe.ts
./lib/prisma.ts
./lib/pyqs-service.ts
./lib/redis.ts
./lib/rosera/inline.ts
./lib/s3.ts
./lib/services/course-matcher.ts
./lib/services/course-metadata-service.ts
./lib/test-series-data.ts
./lib/utils.ts
./lib/utils/access-control.ts
./lib/utils/course-goal-mapper.ts
./lib/validations/tutorial-schema.ts
./lib/webrtc/classroom-webrtc.ts

## 6. Prisma models (name: fields) and enums

User: id email password name image phoneNumber role xp level streak lastActive createdAt updatedAt accounts assessmentAttempts contentUploads enrollments notifications payments progress submissions subscriptions achievements userAnalytics examAttempts 
Account: id userId type provider providerAccountId refresh_token access_token expires_at token_type scope id_token session_state user 
Track: id title slug type description thumbnail order isPublished createdAt courses 
Course: id title slug description thumbnailUrl difficulty duration rating enrollmentCount technology prerequisites status isPremium isPublished price originalPrice discountPercent couponCode couponDiscount expiresAt hasTrialLesson metadataJson externalId theme schemaVersion createdAt updatedAt chapters contentUploads courseAnalytics enrollments reviews tracks 
TrackCourse: id trackId courseId order isRequired course track 
Chapter: id externalId title description order archivedAt locked courseId createdAt course contentUploads lessons 
Lesson: id externalId title type order xpReward videoUrl content slides duration durationText isTrial attachmentType attachmentUrl attachmentName chapterId archivedAt locked schemaVersion currentPublishedVersionId currentDraftVersionId createdAt exercises chapter progress versions currentPublishedVersion currentDraftVersion 
LessonVersion: id lessonId status blocks schemaVersion contentHash needsReview createdBy createdAt note source lesson publishedForLessons draftForLessons 
Enrollment: id userId courseId enrolledAt completedAt course user 
Review: id rating comment userId courseId createdAt course 
Exercise: id title slug instructions starterCode solution hints language difficulty lessonId isPractice category tags createdAt lesson submissions testCases 
TestCase: id exerciseId input expectedOutput isHidden createdAt exercise 
Submission: id userId exerciseId code passed output executionTime createdAt exercise user 
Assessment: id title slug description duration passingScore technology difficulty isPublished createdAt attempts questions 
Question: id type question options correctAnswer explanation points order assessmentId assessment 
AssessmentAttempt: id userId assessmentId answers score passed timeSpent startedAt completedAt assessment user 
Progress: id userId lessonId completed timeSpent lastAccessed lesson user 
Achievement: id name slug description icon xpReward condition createdAt users 
UserAchievement: id userId achievementId unlockedAt achievement user 
Notification: id userId type title message link read createdAt user 
Subscription: id userId plan status provider providerId startDate endDate cancelAtPeriodEnd createdAt updatedAt payments user 
Payment: id userId subscriptionId amount currency status paymentMethod paymentProvider externalId metadata createdAt subscription user 
PromoCode: id code discountType discountValue maxUses usedCount validFrom validUntil isActive createdAt 
ContentUpload: id uploadedBy contentType fileName fileSize mimeType fileUrl s3Key cdnUrl status processingProgress errorMessage metadata associatedCourseId associatedChapterId uploadStartedAt uploadCompletedAt processingCompletedAt associatedChapter associatedCourse uploader 
CourseAnalytics: id courseId date totalEnrollments newEnrollments activeLearnersToday completions completionRate avgCompletionTimeHours totalTimeSpentHours avgTimePerUserHours lessonsCompleted exercisesCompleted averageRating newReviews revenueGenerated createdAt updatedAt course 
UserAnalytics: id userId date loginCount timeSpentMinutes lessonsCompleted exercisesCompleted assessmentsTaken xpEarned achievementsUnlocked streakDays coursesEnrolled coursesCompleted createdAt updatedAt user 
RevenueAnalytics: id date totalRevenue newSubscriptionsRevenue renewalRevenue refunds netRevenue newSubscriptions cancelledSubscriptions activeSubscriptions mrr arr churnRate createdAt updatedAt 
ExamSeries: id title slug examName category description thumbnailUrl isFree isPublished isPro totalTests freeTests usersCount languages createdById createdAt updatedAt tests 
ExamTest: id seriesId title titleHi testType accessMode durationMinutes totalQuestions totalMarks positiveMarks negativeMarks instructions isLive liveStartAt liveEndAt order isPublished createdById createdAt updatedAt series sections attempts 
ExamSection: id testId title titleHi order positiveMarks negativeMarks timeLimitMins test questions 
ExamQuestion: id sectionId questionType questionEn questionHi optionAEn optionBEn optionCEn optionDEn optionAHi optionBHi optionCHi optionDHi correctOption explanationEn explanationHi videoUrl difficulty subject topic subTopic order positiveMarks negativeMarks createdAt updatedAt section answers 
ExamAttempt: id userId testId language status score totalMarks correctCount wrongCount skippedCount markedCount timeTakenSecs percentile allIndiaRank tabSwitchCount startedAt submittedAt answers test user 
ExamAttemptAnswer: id attemptId questionId selectedOption isMarked isCorrect marksAwarded timeSpentSecs attempt question 
[enum] ExamTestType: FULL_MOCK CHAPTER_TEST SECTIONAL_TEST PREVIOUS_YEAR LIVE_SPEED 
[enum] ExamAccess: FREE PRO 
[enum] ExamQuestionType: MCQ MSQ NAT 
[enum] ExamDifficulty: EASY MODERATE HARD 
[enum] ExamAttemptStatus: IN_PROGRESS SUBMITTED TIMED_OUT 
[enum] UserRole: FREE PREMIUM TEACHER ADMIN 
[enum] TrackType: CAREER SKILL 
[enum] CourseStatus: DRAFT PUBLISHED ARCHIVED 
[enum] Difficulty: BEGINNER INTERMEDIATE ADVANCED 
[enum] LessonType: VIDEO EXERCISE ASSESSMENT PROJECT TUTORIAL CODE_ALONG READING 
[enum] QuestionType: MULTIPLE_CHOICE CODE_COMPLETION FILL_BLANK CODE_OUTPUT TRUE_FALSE 
[enum] NotificationType: COURSE_UPDATE NEW_CONTENT ACHIEVEMENT LEADERBOARD SUBSCRIPTION SYSTEM 
[enum] SubscriptionPlan: FREE MONTHLY YEARLY 
[enum] SubscriptionStatus: ACTIVE CANCELED EXPIRED PAST_DUE 
[enum] PaymentProvider: STRIPE RAZORPAY 
[enum] PaymentStatus: PENDING COMPLETED FAILED REFUNDED 
[enum] DiscountType: PERCENTAGE FIXED 
PyqCategory: id name slug fullName description iconUrl badgeColor order isPublished createdAt updatedAt subExams papers 
PyqSubExam: id categoryId name slug description order isPublished createdAt updatedAt category papers 
PyqPaper: id categoryId subExamId creatorId title slug year stage shift examDate durationMin totalMarks totalQuestions languages paperPdfUrl solutionPdfUrl pdfFileSizeKb pageCount accessType unlockPrice isPassIncluded cbtTestId hasCbtMode status downloadCount attemptCount createdAt updatedAt category subExam leads unlocks 
PyqLeadCapture: id paperId phoneNumber userId source createdAt paper 
PyqUnlock: id userId paperId paymentId amountPaid unlockedAt paper 

## 7. Files using server actions ("use server")
./lib/actions/admin/analytics.ts
./lib/actions/admin/assessments.ts
./lib/actions/admin/audit.ts
./lib/actions/admin/chapters.ts
./lib/actions/admin/course-metadata.ts
./lib/actions/admin/courses.ts
./lib/actions/admin/exercises.ts
./lib/actions/admin/lessons.ts
./lib/actions/admin/profile.ts
./lib/actions/admin/publishing.ts
./lib/actions/admin/settings.ts
./lib/actions/admin/tracks.ts
./lib/actions/admin/tutorial-import.ts
./lib/actions/admin/users.ts
./lib/actions/auth.ts
./lib/actions/course/enrollment.ts
./lib/actions/course/progress.ts
./lib/actions/gamification.ts
./lib/actions/payment/razorpay.ts
./lib/actions/payment/stripe.ts
./lib/actions/tracks/career.ts
./lib/actions/user/profile.ts
./lib/actions/user/subscription.ts

## 8. Client components count vs total tsx
client components: 210 of 301 tsx files

## 9. Environment variable NAMES referenced in code (values are NOT included)
process.env.AWS_ACCESS_KEY_ID
process.env.AWS_CLOUDFRONT_DOMAIN
process.env.AWS_REGION
process.env.AWS_S3_BUCKET
process.env.AWS_S3_BUCKET_NAME
process.env.AWS_SECRET_ACCESS_KEY
process.env.GEMINI_API_KEY
process.env.NEXT_PUBLIC_APP_URL
process.env.NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL
process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
process.env.NODE_ENV
process.env.PISTON_API_URL
process.env.RAZORPAY_KEY_ID
process.env.RAZORPAY_KEY_SECRET
process.env.RAZORPAY_WEBHOOK_SECRET
process.env.REDIS_URL
process.env.STRIPE_MONTHLY_PRICE_ID
process.env.STRIPE_SECRET_KEY
process.env.STRIPE_WEBHOOK_SECRET
process.env.STRIPE_YEARLY_PRICE_ID

## 10. Auth, middleware and config files
auth.config.ts
auth.ts
eslint.config.mjs
middleware.ts
next.config.js
postcss.config.mjs
tailwind.config.ts
tsconfig.json

## 11. Feature flags (NEXT_PUBLIC_ names)
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_ENABLE_MOBILE_NATIVE_SHELL
NEXT_PUBLIC_RAZORPAY_KEY_ID

## 12. Data files and scripts
data/batches.json
data/book-coupons.json
data/book-orders.json
data/books.json
data/course-metadata.json
data/doubts.json
data/goals-config.json
data/homepage-cards.json
data/platform-settings.json
scripts/audit-runner.ts
scripts/backfill-lesson-versions.ts
scripts/check-course-content.ts
scripts/create-admin.ts
scripts/create-test-users.sql
scripts/gen-project-map.sh
scripts/generate-password-hashes.ts
scripts/migrate-tutorial-format.ts
scripts/rosera-codemod.mjs
scripts/seed-12-category-courses.ts
scripts/seed-assessment.ts
scripts/seed-audit-users.ts
scripts/seed-batches.js
scripts/seed-bpsc-course.ts
scripts/seed-ca-quiz.ts
scripts/seed-rbac-users.ts
scripts/setup-audit-auth.ts
scripts/setup-stripe-webhook.sh
scripts/test-db.ts
scripts/test-import-package.ts
scripts/test-m3-editor.ts
scripts/test-tutorial-features-suite.ts
scripts/verify-assessment-flow.ts
scripts/verify-exercise-db.ts

## 13. Largest source files (lines)
    2757 ./app/(dashboard)/teacher/test-series/create/page.tsx
    2659 ./components/admin/courses/VideoCourseEditorClient.tsx
    1884 ./app/(dashboard)/courses/[slug]/CourseDetailView.tsx
    1818 ./components/editor/RoseraRenderer.tsx
    1689 ./components/editor/RichContentEditor.tsx
    1627 ./components/editor/RoseraEditor.tsx
    1533 ./app/(exam)/test-series/[id]/result/page.tsx
    1487 ./app/(exam)/test-series/[id]/attempt/page.tsx
    1438 ./lib/classroom-service.ts
    1388 ./app/(dashboard)/pyqs/page.tsx
    1316 ./components/editor/TutorialImportModal.tsx
    1247 ./lib/actions/admin/tutorial-import.ts
    1231 ./app/(dashboard)/pyqs/[examId]/page.tsx
    1067 ./app/(exam)/test-series/[id]/solutions/page.tsx
    1043 ./components/editor/AspirantbookTutorialView.tsx
    1010 ./app/batches/[slug]/BatchDetailClient.tsx
     940 ./components/editor/CodecademyContentRenderer.tsx
     930 ./components/practice/CodingPracticeView.tsx
     923 ./components/editor/UniversalEditor.tsx
     918 ./components/course/CourseBundleView.tsx
     890 ./lib/coding-practice-data.ts
     884 ./components/dashboard/StudentDashboardClient.tsx
     861 ./components/course/CoursePlayerClient.tsx
     850 ./components/admin/BatchForm.tsx
     846 ./app/(dashboard)/test-series/page.tsx

## 14. Hardcoded hex colours per file (top 15)
./app/(exam)/test-series/[id]/result/page.tsx:133
./app/(dashboard)/teacher/test-series/create/page.tsx:126
./app/(exam)/test-series/[id]/attempt/page.tsx:121
./app/admin/settings/SettingsClient.tsx:115
./app/(dashboard)/courses/[slug]/CourseDetailView.tsx:89
./components/editor/CodecademyContentRenderer.tsx:84
./components/editor/RichContentEditor.tsx:83
./app/(dashboard)/test-series/page.tsx:70
./app/(dashboard)/test-series/[id]/page.tsx:53
./components/editor/UniversalEditor.tsx:48
./components/editor/RoseraEditor.tsx:45
./components/editor/AspirantbookTutorialView.tsx:40
./app/batches/[slug]/BatchDetailClient.tsx:40
./components/dashboard/StudentDashboardClient.tsx:35
./components/editor/TutorialImportModal.tsx:34

## 15. TODO / FIXME locations (first 40)
./components/track/LearningPath.tsx:10:    userProgress?: any[] // TODO: Type properly with Enrollment/Progress
./components/track/LearningPath.tsx:17:                const isCompleted = false // TODO: Check userProgress

## 16. Tests

## 17. Git (recent branches and last 15 commits)
  feat/mobile-native-shell
  feat/rosera-renderer-theme-security
* fix/responsive-batch-1
  fix/tutorial-overview-reader-consistency
  main
23c0565 feat(rosera): implement theme CSS variables, XSS sanitization, and iframe sandbox fixes
89c2969 feat(TrillionSkill): complete platform release — video courses, exams, test series, books, doubts, payments & mobile OTP auth
a64af0a Update MarketFlow: Save current progress
2e3b016 fix: TypeError in addStock function - type check for symbolToAdd
c5b76ea fix: Hydration error and numpy serialization issues
7444950 feat: Enable press Enter to add any stock from search
ed8d91f feat: Generalize Charts stock selection with search & add
921d04c feat: Add live stock search with yfinance integration
9470e08 feat: Expand scanner to 40+ popular NSE stocks
af8c9d6 feat: Add pattern recognition, breakout detection & volume analysis to scanner
0ad14e6 feat: Add QuantStats portfolio analytics integration
e7f057d feat: Add web scraping infrastructure with BeautifulSoup + Playwright
0872d10 feat: Add market-based stock suggestions
2cf8108 fix: Parse confidence from LLM markdown response
b351c5e feat: Add LLM news analysis with stock search and Groq integration
