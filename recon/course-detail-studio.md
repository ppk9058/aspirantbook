# Reconnaissance Report: Course Detail Studio & Public Course Detail Page

**Target:** Generalizing the Course Detail Studio (Admin / Editor & Public Course Detail Module) for any course / exam  
**Execution Mode:** READ-ONLY RECONNAISSANCE (Zero code changes, zero migrations, zero database mutations)  
**Date:** 2026-10-28  
**Branch:** `fix/audit2-hardening`  

---

## 1. Location Map

All paths, exact line counts (`wc -l`), and workspace scope tags (`[WEB]`, `[MOBILE]`, `[SHARED]`, `[LIB]`, `[API]`).

| Scope | Path | Lines | Description / Responsibility |
|:---|:---|:---:|:---|
| **[WEB]** | `app/(dashboard)/courses/[slug]/page.tsx` | 414 | Public course detail router: discriminates tutorial redirect, coming soon, video bundle (`CourseBundleView`), and document course (`CourseDetailView`). |
| **[WEB]** | `app/(dashboard)/courses/[slug]/CourseDetailView.tsx` | 1990 | Public document-style course detail view with in-place Rosera/Codecademy editor toolbar. |
| **[WEB]** | `components/course/CourseBundleView.tsx` | 980 | Commercial public course detail view (pricing card, syllabus accordion, schedule timeline, mentors, FAQs, demo booking). |
| **[WEB]** | `components/course/CourseComingSoonView.tsx` | 251 | Fallback view for draft / unpopulated / coming soon courses. |
| **[WEB]** | `components/course/CourseHeader.tsx` | 95 | Header component with breadcrumb, title, and action badges. |
| **[WEB]** | `components/course/CoursePromoBadge.tsx` | 111 | Promotional badge rendering for discounts & trials. |
| **[WEB]** | `components/course/CourseTeachersSection.tsx` | 251 | "Meet Your Mentors" interactive faculty row with Laurel emblem and detail card. |
| **[WEB]** | `components/course/LaurelSealEmblem.tsx` | 105 | SVG decorative laurel seal behind active instructor avatar. |
| **[WEB]** | `components/courses/EnrollButton.tsx` | 116 | Client enrollment CTA with login modal / checkout trigger. |
| **[WEB]** | `components/courses/CourseDocumentTabs.tsx` | 505 | Sticky tab navigation for document-mode course reader. |
| **[WEB]** | `components/course/ScheduleDemoModal.tsx` | 600 | Modal for scheduling free live demo class with phone OTP and slot selection. |
| **[WEB]** | `components/course/EnhancedVideoPlayer.tsx` | 424 | Custom video player with speed controls, quality, and theater mode. |
| **[WEB]** | `components/course/VideoPlayer.tsx` | 91 | Fallback HTML5 video player wrapper. |
| **[WEB]** | `components/course/LiveDemoRoomClient.tsx` | 2226 | WebRTC / Agora live interactive classroom for demo sessions. |
| **[WEB]** | `app/(dashboard)/courses/[slug]/demo/page.tsx` | 195 | Demo classroom entry page enforcing demo booking verification. |
| **[WEB]** | `app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx` | 312 | Student lesson playback & reading room. |
| **[WEB]** | `app/batches/[slug]/page.tsx` | 38 | Public batch detail page loader (reads `batches.json`). |
| **[WEB]** | `app/batches/[slug]/BatchDetailClient.tsx` | 995 | Public batch detail client (sibling design with weekly schedule & tiers). |
| **[WEB]** | `app/admin/courses/page.tsx` | 187 | Admin Video Course Studio directory listing. |
| **[WEB]** | `app/admin/courses/[id]/edit/page.tsx` | 61 | Admin Course Studio loader delegating to `VideoCourseEditorClient`. |
| **[WEB]** | `app/(dashboard)/teacher/courses/[id]/edit/page.tsx` | 1 | Teacher studio route re-exporting `app/admin/courses/[id]/edit/page.tsx`. |
| **[WEB]** | `components/admin/courses/VideoCourseEditorClient.tsx` | 3232 | **Course Detail Studio core editor**: tabs for Syllabus, Mentors, Schedule, Highlights, FAQs, Coupons, Demo Classroom. |
| **[WEB]** | `components/admin/courses/CourseCouponsManager.tsx` | 705 | Course coupon authoring & discount code manager. |
| **[WEB]** | `app/admin/courses/[id]/edit/CourseEditClient.tsx` | 710 | Rosera Tutorial Studio editor (sibling editor for text tutorials). |
| **[WEB]** | `components/admin/BatchForm.tsx` | 854 | Admin batch editor (CRUD for `data/batches.json`). |
| **[LIB]** | `lib/actions/admin/courses.ts` | 601 | Server actions for course creation, updating, inline metadata, and archiving. |
| **[LIB]** | `lib/actions/admin/chapters.ts` | 322 | Server actions for chapter CRUD, reordering, and gating. |
| **[LIB]** | `lib/actions/admin/lessons.ts` | 669 | Server actions for lesson CRUD, reordering, versions, and attachments. |
| **[LIB]** | `lib/actions/admin/course-metadata.ts` | 276 | Server actions for course inclusions, project counts, skills, and teachers array. |
| **[LIB]** | `lib/services/courses.service.ts` | 510 | Domain service for course listings, curriculum resolution, and lesson gating. |
| **[LIB]** | `lib/services/course-metadata-service.ts` | 186 | Custom metadata service (reads DB `metadataJson` -> file `data/course-metadata.json` -> defaults). |
| **[LIB]** | `lib/courses/course-dto.ts` | 212 | Sanitizer stripping video URLs and attachments from unauthorized visitors. |
| **[LIB]** | `lib/courses/visibility.ts` | 50 | Access rules determining if a draft course is viewable. |
| **[LIB]** | `lib/batches-service.ts` | 290 | Service reading and mutating `data/batches.json`. |
| **[API]** | `app/api/courses/enroll/route.ts` | 164 | Web course enrollment endpoint. |
| **[API]** | `app/api/courses/demo/book/route.ts` | 282 | Demo slot booking & lead capture endpoint. |
| **[API]** | `app/api/courses/[slug]/demo-slots/route.ts` | 91 | Public endpoint returning upcoming demo slots for a course. |
| **[API]** | `app/api/admin/courses/[id]/route.ts` | 143 | Admin PUT & DELETE course endpoint with RBAC + ownership check. |
| **[API]** | `app/api/admin/courses/upload/route.ts` | 65 | Course media upload handler (S3 object storage via `storeUpload`). |
| **[API]** | `app/api/admin/courses/[id]/demo-slots/route.ts` | 215 | Admin CRUD for live demo classroom slots. |
| **[API]** | `app/api/admin/courses/[id]/demo-report/route.ts` | 244 | Admin attendance & conversion analytics for demo sessions. |
| **[API]** | `app/api/admin/pyqs/leads/route.ts` | 35 | Lead capture endpoint for PYQ downloads. |
| **[SHARED]** | `packages/shared/src/dto/content.dto.ts` | 276 | Shared DTOs: `CourseSummaryDto`, `CourseChapterDto`, `CourseDetailDto`, `CourseLessonDetailDto`. |
| **[SHARED]** | `packages/shared/src/client.ts` | 406 | Cross-platform client methods: `getCourseDetail`, `getCourseLesson`, `enrollFreeCourse`. |
| **[MOBILE]** | `apps/mobile/src/app/(tabs)/courses.tsx` | 471 | React Native course exploration & category filter tab screen. |
| **[MOBILE]** | `apps/mobile/src/app/courses/[id].tsx` | 574 | React Native course detail screen (consumes `/api/v1/courses/:id`). |
| **[MOBILE]** | `apps/mobile/src/app/courses/[id]/lesson/[lessonId].tsx` | 798 | React Native video lesson player & attachment viewer screen. |
| **[MOBILE]** | `apps/mobile/src/lib/course-progress.ts` | 58 | Mobile offline progress cache & description truncation helper. |
| **[SHARED]** | `prisma/schema.prisma` | 1651 | Database schema defining `Course`, `Chapter`, `Lesson`, `DemoSlot`, `DemoBooking`, `Enrollment`. |

---

## 2. Data Model

### Verbatim Prisma Models

#### Model: `Course` (`prisma/schema.prisma:95-150`)
```prisma
model Course {
  id                String              @id @default(cuid())
  title             String
  slug              String              @unique
  description       String
  thumbnailUrl      String?
  difficulty        Difficulty
  duration          Int                 @default(0)
  rating            Float               @default(0)
  enrollmentCount   Int                 @default(0)
  technology        String              @default("")
  prerequisites     String[]
  status            CourseStatus        @default(DRAFT)
  isPremium         Boolean             @default(false)
  isPublished       Boolean             @default(false)
  price             Int?                @default(0)
  originalPrice     Int?                @default(0)
  discountPercent   Int?                @default(0)
  couponCode        String?             @default("OFF50")
  couponDiscount    Int?                @default(50)
  expiresAt         String?             @default("Oct 30, 2026")
  hasTrialLesson    Boolean             @default(true)
  metadataJson      String?
  createdById       String?
  externalId        String?             @unique
  theme             Json?
  schemaVersion     Int                 @default(1)
  // Authwall Gate Settings
  isGated           Boolean             @default(false)
  previewPercentage Int                 @default(20)
  seoMode           String              @default("preview") // "preview" | "bot-full"
  gateTitle         String?
  gateSubtitle      String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  chapters          Chapter[]
  contentUploads    ContentUpload[]
  courseAnalytics   CourseAnalytics[]
  enrollments       Enrollment[]
  reviews           Review[]
  tracks            TrackCourse[]
  demoBookings      CourseDemoBooking[]
  demoSlots         DemoSlot[]
  demoBookingsV2    DemoBooking[]
  coupons           Coupon[]
  couponRedemptions CouponRedemption[]
  createdBy         User?               @relation("UserCreatedCourses", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([slug])
  @@index([createdById])
  @@index([difficulty])
  @@index([status])
  @@index([isPublished])
  @@index([status, enrollmentCount])
}
```

#### Model: `Chapter` (`prisma/schema.prisma:165-185`)
```prisma
model Chapter {
  id                String          @id @default(cuid())
  externalId        String?
  title             String
  description       String?
  order             Float           @default(1000)
  archivedAt        DateTime?
  locked            Boolean         @default(false)
  // Authwall Gate Settings
  gateMode          String          @default("inherit") // "inherit" | "free" | "preview" | "locked"
  previewPercentage Int?
  courseId          String
  createdAt         DateTime        @default(now())
  course            Course          @relation(fields: [courseId], references: [id], onDelete: Cascade)
  contentUploads    ContentUpload[]
  lessons           Lesson[]

  @@unique([courseId, externalId])
  @@index([courseId])
  @@index([order])
}
```

#### Model: `Lesson` (`prisma/schema.prisma:187-228`)
```prisma
model Lesson {
  id                        String          @id @default(cuid())
  externalId                String?
  title                     String
  type                      LessonType
  order                     Float           @default(1000)
  xpReward                  Int             @default(10)
  videoUrl                  String?
  content                   String?
  slides                    String?
  duration                  Int?
  durationText              String?
  isTrial                   Boolean         @default(false)
  attachmentType            String?
  attachmentUrl             String?
  attachmentName            String?
  chapterId                 String
  archivedAt                DateTime?
  locked                    Boolean         @default(false)
  // Authwall Gate Settings & Pre-chunking
  gateMode                  String          @default("inherit") // "inherit" | "free" | "preview" | "locked"
  previewPercentage         Int?
  blockCount                Int?
  contentHash               String?
  schemaVersion             Int             @default(1)
  currentPublishedVersionId String?
  currentDraftVersionId     String?
  createdAt                 DateTime        @default(now())
  exercises                 Exercise[]
  chapter                   Chapter         @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  progress                  Progress[]
  versions                  LessonVersion[] @relation("LessonAllVersions")
  currentPublishedVersion   LessonVersion?  @relation("LessonCurrentPublishedVersion", fields: [currentPublishedVersionId], references: [id], onDelete: SetNull)
  currentDraftVersion       LessonVersion?  @relation("LessonCurrentDraftVersion", fields: [currentDraftVersionId], references: [id], onDelete: SetNull)

  @@unique([chapterId, externalId])
  @@index([chapterId])
  @@index([type])
  @@index([order])
  @@index([currentPublishedVersionId])
  @@index([currentDraftVersionId])
}
```

#### Model: `DemoSlot` (`prisma/schema.prisma:310-345`)
```prisma
model DemoSlot {
  id                 String         @id @default(cuid())
  createdById        String?
  courseId           String
  startTime          DateTime // UTC datetime
  durationMinutes    Int            @default(60)
  topic              String
  facultyName        String
  agoraChannelName   String         @unique // ONE channel per slot, shared by all students
  maxAudience        Int            @default(100)
  status             DemoSlotStatus @default(SCHEDULED)
  stageLayout        String         @default("CORNER") // CORNER | SPLIT
  maxOnStage         Int            @default(1)
  startedAt          DateTime?
  endedAt            DateTime?
  hostHeartbeatAt    DateTime?
  teacherLayout      String         @default("FACE_ONLY") // FACE_ONLY | SCREEN_WITH_FACE_CORNER | SCREEN_ONLY
  screenShareActive  Boolean        @default(false)
  facePosition       String         @default("top-right") // top-right | top-left | bottom-left | bottom-right
  screenStartedAt    DateTime?
  screenEndedAt      DateTime?
  totalScreenMinutes Int            @default(0)
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  course        Course             @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdBy     User?              @relation("UserCreatedDemoSlots", fields: [createdById], references: [id], onDelete: SetNull)
  bookings      DemoBooking[]
  chatMessages  DemoChatMessage[]
  stageSessions DemoStageSession[]

  @@index([courseId])
  @@index([createdById])
  @@index([startTime])
  @@index([status])
}
```

#### Model: `DemoBooking` (`prisma/schema.prisma:347-366`)
```prisma
model DemoBooking {
  id           String            @id @default(cuid())
  studentId    String
  mobile       String // E.164 normalized e.g. +91XXXXXXXXXX
  slotId       String
  courseId     String
  status       DemoBookingStatus @default(BOOKED)
  joinedAt     DateTime?
  leftAt       DateTime?
  lastSeenAt   DateTime?
  handRaisedAt DateTime?
  watchSeconds Int               @default(0)
  utmSource    String?
  utmCampaign  String?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  student User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  slot    DemoSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  course  Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([studentId, slotId])
  @@index([studentId])
  @@index([slotId])
  @@index([courseId])
}
```

> [!NOTE]
> There are **NO** dedicated relational tables for `Teacher` or `FAQ` in `prisma/schema.prisma`. Faculty profiles and FAQs are persisted either in the `Course.metadataJson` column or inside static JSON files (`data/batches.json`).

---

### Storage Source Mapping Table

| Section | Source (DB Column / JSON Blob / Hardcoded) | File:Line |
|:---|:---|:---|
| Hero Title | DB column: `Course.title` | `CourseBundleView.tsx:773`, `CourseDetailView.tsx:1034` |
| Hero Subtitle / Description | DB column: `Course.description` | `CourseBundleView.tsx:585`, `CourseDetailView.tsx:1046` |
| Pill Tags (Technology, Difficulty) | DB columns: `Course.technology`, `Course.difficulty` | `CourseBundleView.tsx:355-365` |
| 4-Metric Grid (Target, Medium, Mode, Lectures) | **Hybrid**: Target = `Course.technology` / `metadataJson.classTag`; Medium = `metadataJson.language` (default "HINGLISH"); Mode = Hardcoded "100% Online"; Lectures = Relation count (`chapters.lessons.length`) | `CourseBundleView.tsx:590-620` |
| Sticky Card Thumbnail | DB column: `Course.thumbnailUrl` | `CourseBundleView.tsx:770` |
| Sticky Card Pricing & Discount | DB columns: `Course.price`, `Course.originalPrice`, `Course.discountPercent` | `CourseBundleView.tsx:810-835` |
| Sticky Card Coupon Code | DB column: `Course.couponCode`, `Course.couponDiscount` | `CourseBundleView.tsx:799-808` |
| Sticky Card Expiration Date | DB column: `Course.expiresAt` (default "Oct 30, 2026") | `CourseBundleView.tsx:793-797` |
| What's Included List | **Hybrid**: DB count `totalLessons`, `Course.hasTrialLesson`, plus hardcoded strings | `CourseBundleView.tsx:945-965`, `types/course-metadata.ts:18-24` |
| Syllabus Tree (Chapters & Lessons) | Relational DB: `Course.chapters` -> `Chapter.lessons` | `CourseBundleView.tsx:438-575`, `CourseDetailView.tsx:430-580` |
| Lesson Attachments (PDF notes) | DB columns: `Lesson.attachmentType`, `Lesson.attachmentUrl`, `Lesson.attachmentName` | `CourseBundleView.tsx:534-548`, `VideoCourseEditorClient.tsx:2880` |
| Trial Lesson Badge & Lock Flag | DB column: `Lesson.isTrial`, calculated against `isEnrolled` / `hasAccess` | `CourseBundleView.tsx:516-565` |
| Mentors / Teachers List | JSON blob: `Course.metadataJson.teachers[]` with fallback to `batch.teachers` or hardcoded `DEFAULT_REFERENCE_TEACHERS` | `CourseTeachersSection.tsx:34-78`, `CourseBundleView.tsx:313-324` |
| About Highlights | JSON blob: `Course.metadataJson.aboutHighlights[]` with fallback to `batch.aboutHighlights` or hardcoded bullets | `CourseBundleView.tsx:278-310`, `VideoCourseEditorClient.tsx:465` |
| Schedule / Lecture Plan | JSON blob: `Course.metadataJson.schedule[]` with fallback to `batch.weeklySchedule` | `CourseBundleView.tsx:646-715`, `VideoCourseEditorClient.tsx:464` |
| FAQs Accordion | JSON blob: `Course.metadataJson.faqs[]` with fallback to `batch.faqs` or hardcoded default FAQ array | `CourseBundleView.tsx:327-353`, `724-765` |
| Live Demo Classroom Settings | JSON blob: `Course.metadataJson.demoSettings` + Relational table `DemoSlot` | `ScheduleDemoModal.tsx:70-110`, `CourseBundleView.tsx:885-930` |
| Inclusions & Acquired Skills | JSON blob: `Course.metadataJson` (`features`, `skills`) with legacy fallback to `data/course-metadata.json` | `lib/services/course-metadata-service.ts:22`, `types/course-metadata.ts:1-35` |

---

## 3. Hardcoded / BPSC-Specific Content

Grep investigation across `app`, `components`, `lib`, `packages`, `data`, and `docs` for requested terms:

| Term | File:Line | What It Controls | Generalization Action Required |
|:---|:---|:---|:---|
| `"bpsc"` | `app/(dashboard)/courses/[slug]/page.tsx:317` | `course.slug.includes("bpsc") ||` hardcodes routing into `isVideoBundle` (`CourseBundleView`). | Remove slug substring check; check `course.format === "bundle"` or presence of price/video chapters. |
| `"72nd-bpsc-prelims-current-affairs"` | `app/admin/courses/page.tsx:41` | Forces this specific slug to be classified as a Video Course even if it has no video lessons or price. | Remove hardcoded slug check; classify purely by `course.type` or `course.format`. |
| `"72nd-bpsc-prelims-current-affairs"` | `app/admin/tutorials/page.tsx:48` | Excludes this specific course from tutorials studio. | Replace slug exclusion with formal `course.type !== 'TUTORIAL'` filter. |
| `"72nd-bpsc-prelims-current-affairs"` | `app/(dashboard)/tutorials/page.tsx:131` | Excludes this specific course from student tutorials page. | Replace slug exclusion with DB `format` / `type` attribute. |
| `"72nd-bpsc-prelims-current-affairs"` | `app/sitemap.ts:149` | Excludes this course from textual tutorial sitemaps. | Use metadata flag instead of hardcoded slug string. |
| `"bpsc-prelims-current-affairs"` | `app/api/auth/mobile-login/route.ts:13` | Hardcoded course alias rewrite in mobile checkout redirect. | Make slug alias mapping dynamic or remove legacy alias. |
| `"bpsc-prelims-current-affairs"` | `app/api/checkout/course-info/route.ts:13` | Hardcoded course alias rewrite in web checkout route. | Move aliases to DB table or remove legacy redirect. |
| `"bpsc-prelims-current-affairs"` | `app/api/courses/enroll/route.ts:14` | Hardcoded course alias rewrite during direct enrollment. | Move aliases to DB table or remove legacy redirect. |
| `"bpsc-prelims-current-affairs"` | `app/api/verify-payment/razorpay/route.ts:15` | Hardcoded course alias rewrite during Razorpay order verification. | Move aliases to DB table or remove legacy redirect. |
| `"BPSC"` | `components/admin/courses/VideoCourseEditorClient.tsx:1042` | Hardcoded `<option value="BPSC">BPSC Civil Services</option>` in category dropdown. | Populate categories dynamically from database / platform configuration. |
| `"72nd BPSC Prelims Strategy & Trend Analysis"` | `components/admin/courses/VideoCourseEditorClient.tsx:2074` | Placeholder string on Section / Chapter title input. | Replace with generic placeholder `e.g. Module 1: Core Fundamentals`. |
| `"Bihar Special Governance"` | `components/admin/courses/VideoCourseEditorClient.tsx:2380` | Placeholder string on Section edit input modal. | Replace with generic placeholder `e.g. Advanced Topics & Analysis`. |
| `"HINGLISH"` | `components/admin/courses/VideoCourseEditorClient.tsx:128` | Default language state fallback `initialMeta.language \|\| "HINGLISH"`. | Make selectable from configurable language list or course default. |
| `"HINGLISH"` | `components/admin/courses/VideoCourseEditorClient.tsx:1683` | Hardcoded option `<option value="HINGLISH">Hinglish (Hindi + English)</option>`. | Standardize available languages list. |
| `"HINGLISH"` | `components/course/CourseBundleView.tsx:364`, `604` | Display fallback: `{batch?.language \|\| "HINGLISH"}`. | Fall back to `course.language \|\| "English"`. |
| `"HINGLISH"` | `components/course/CourseComingSoonView.tsx:43`, `192` | Default prop `language = "HINGLISH"` and hardcoded text `"delivered in Hinglish/English"`. | Replace with parameterized `{language}` label. |
| `"72nd BPSC"` | `components/course/LiveDemoRoomClient.tsx:2110-2111` | Hardcoded demo agenda bullets `"72nd BPSC Prelims syllabus structure"`. | Read agenda items from `demoSettings.agenda[]` in `metadataJson`. |
| `"BPSC Mains — Essay & GS Paper Video Batch"` | `components/home/homepage-courses.data.ts:169` & `data/homepage-cards.json:90` | Hardcoded card in static catalog with slug `bpsc-mains-essay-gs-paper-video-batch`. | Card item in static catalog; already editable via `/admin/homepage-cards`. |
| `"5,499"` | `components/home/homepage-courses.data.ts:358` & `data/homepage-cards.json:271` | Hardcoded original price `"₹5,499"` on Class 9 batch. | Pure card display string in static catalog. |
| `"Demolish"` | Entire repository & git history | **NOT FOUND** | Does not exist in any file or commit history. |
| `"Abhimanyu"` | Entire repository & git history | **NOT FOUND** | Does not exist in any file or commit history. |
| `"19 Oct"` | Course and studio files | **NOT FOUND** (outside of release logs `19 Oct 2026`) | Does not exist as a date rule in any active component. |
| `"IAS Valley"` | `data/books.json:6901, 7010`, `lib/books/data.ts:322, 372`, `public/images/books/bpsc-current-affairs.svg:14` | Book publication author and SVG watermark. Not in course code. | Belongs exclusively to the Books / eBook module. |

---

## 4. Spec Coverage Matrix

Comparison of public course detail surfaces (`CourseBundleView`, `CourseDetailView`, `CourseTeachersSection`) against the target specification:

| Feature / Section Component | Status | Evidence / Implementation Notes |
|:---|:---:|:---|
| **Hero: Title & Subtitle** | **EXISTS** | `CourseBundleView.tsx:773`, `585`; `CourseDetailView.tsx:1034-1046`. |
| **Hero: Instructor Block** | **EXISTS** | `CourseTeachersSection.tsx:1-251` embedded at `CourseBundleView.tsx:717`. |
| **Hero: 4-Metric Grid** | **EXISTS** | `CourseBundleView.tsx:590-620` (`grid grid-cols-2 sm:grid-cols-4` for Target, Medium, Mode, Lectures). |
| **Hero: Late-joiner Note** | **MISSING** | NOT FOUND on course views. Present only in `BatchDetailClient.tsx:205` as general schedule text. |
| **Hero: Pill Tags** | **EXISTS** | `CourseBundleView.tsx:355-370` (Category, Mode, Video Course). |
| **Hero: Illustration / Thumbnail** | **EXISTS** | `CourseBundleView.tsx:770-785` (Aspect-video thumbnail poster). |
| **Sticky Course Card: Thumbnail + Badge** | **EXISTS** | `CourseBundleView.tsx:768-785` (Desktop sticky sidebar `top-20`). |
| **Sticky Course Card: Price & Discount** | **EXISTS** | `CourseBundleView.tsx:810-835` (Final price, strike-through original price, discount badge). |
| **Sticky Course Card: Enroll CTA** | **EXISTS** | `CourseBundleView.tsx:842-880` (`handleEnrollClick`, `BUY NOW`, `START A FREE TRIAL`). |
| **Sticky Course Card: Disclaimer** | **PARTIAL** | Shows "Expires On [Date]" and coupon disclaimer; general terms disclaimer is omitted. |
| **Sticky Course Card: Share Modal** | **MISSING** | NOT FOUND in `CourseBundleView`. Only copy coupon button exists (`CourseBundleView.tsx:800`). |
| **Sticky Course Card: Add-to-calendar (.ics)** | **MISSING** | **NOT FOUND** anywhere in course detail or studio files. |
| **Sticky Sub-nav with Scroll-spy + Price/CTA** | **PARTIAL** | Scroll-spy tabs exist at `CourseBundleView.tsx:410-435` (`sticky top-16 z-20`), but it does **NOT** contain the mini-price / CTA on the right side of the bar. |
| **About: What you get** | **EXISTS** | `CourseBundleView.tsx:945-965` ("What's included": lesson counts, trial lesson, accessibility). |
| **About: About this course** | **EXISTS** | `CourseBundleView.tsx:580-645` (rich course description text & target metrics). |
| **About: Credential badges** | **PARTIAL** | Shows verified badge on teachers (`CourseTeachersSection.tsx:210`), but general course accreditation badges are missing. |
| **About: How-it-works list** | **PARTIAL** | Highlight bullets exist (`CourseBundleView.tsx:625-645`), but no structured numbered 1-2-3 how-it-works progression. |
| **Course Plan: Zig-zag timeline** | **PARTIAL** | Schedule tab (`CourseBundleView.tsx:646-715`) renders a vertical day-by-day card layout with time pills; not an alternating zig-zag graphic. |
| **Course Plan: Accordion topics** | **EXISTS** | `CourseBundleView.tsx:438-575` (collapsible chapters with lesson lists and duration). |
| **Syllabus: Intro banner** | **PARTIAL** | Standard section title header exists; promotional intro banner is missing. |
| **Syllabus: EN/HI toggle** | **MISSING** | **NOT FOUND** on course page. Course content is single-language. |
| **Syllabus: Paper tabs** | **MISSING** | **NOT FOUND** on course page. Present only in PYQ module (`PyqPapersListClient.tsx`). |
| **Syllabus: Search** | **MISSING** | **NOT FOUND** inside the syllabus accordion. Exists only on `/courses` directory listing. |
| **Syllabus: By subject / Most asked** | **MISSING** | **NOT FOUND** in course syllabus. Exists only in Content Engine question archive. |
| **Syllabus: Year heat-bars** | **MISSING** | **NOT FOUND** in courses. Exists only as learner activity heatmap (`ProgressCharts.tsx:69`). |
| **Syllabus: "In the course" links** | **MISSING** | **NOT FOUND**. No linkage between PYQs/exam questions and course curriculum units. |
| **Teachers: Profiles** | **EXISTS** | `CourseTeachersSection.tsx:1-251` (5-educator lineup, hover scaling, laurel seal, bio card). |
| **Teachers: Callback form** | **MISSING** | **NOT FOUND**. No "Call me back" form exists in the teachers section. |
| **Questions: Rating distribution** | **MISSING** | Shows only aggregate numeric rating (e.g. 4.8); star breakdown bars (5★, 4★, etc.) are NOT implemented. |
| **Questions: FAQ accordion** | **EXISTS** | `CourseBundleView.tsx:724-765` (collapsible question/answer items from `metadataJson.faqs`). |
| **Lecture-by-lecture: Subject tabs** | **PARTIAL** | Schedule section groups by day and lists subjects (`CourseBundleView.tsx:670`), but no filterable subject tabs exist above lectures. |
| **Lecture-by-lecture: Calendar widget rows** | **EXISTS** | `CourseBundleView.tsx:660-705` (Date/Day pill, time pill, instructor badge, topic list). |
| **Lecture-by-lecture: Lock icon** | **EXISTS** | `CourseBundleView.tsx:550-565` (Lock / Unlock icon indicating guest vs trial vs enrolled access). |
| **Bottom Sticky CTA Banner (Mobile)** | **MISSING** | **NOT FOUND** in `CourseBundleView.tsx`. On mobile viewports (<1024px), the user must scroll all the way down to reach the buy card. |

---

## 5. Studio (Editor) State

### 1. How Admins Edit Each Section Today
The current studio for Video Courses is `components/admin/courses/VideoCourseEditorClient.tsx` (accessed via `/admin/courses/[id]/edit` or `/teacher/courses/[id]/edit`):
- **Core Info & Pricing**: Direct form inputs (Title, Slug, Category, Description, Price, Original Price, Discount, Coupon, Expiry Date).
- **Curriculum (Chapters & Lessons)**: Interactive modal forms.
  - Add/Edit Chapter Modal (`VideoCourseEditorClient.tsx:2360-2440`).
  - Add/Edit Lesson Modal with Video URL, Duration, PDF Attachment URL (`VideoCourseEditorClient.tsx:2470-2950`).
- **Mentors / Teachers**: Interactive form array (`VideoCourseEditorClient.tsx:1499-1650`). Allows adding, updating, and deleting teacher objects (`name`, `role`, `subject`, `experience`, `qualification`, `avatar`, `followers`, `bio`).
- **Weekly Schedule**: Interactive form array (`VideoCourseEditorClient.tsx:1651-1776`). Allows adding days, time slots, subjects, and instructor names.
- **About Highlights**: String array inputs with add/remove buttons (`VideoCourseEditorClient.tsx:1777-1832`).
- **FAQs**: Question and answer paired inputs with add/remove buttons (`VideoCourseEditorClient.tsx:1833-1905`).
- **Demo Classroom**: Slot creator and manager (`VideoCourseEditorClient.tsx:2010-2350`).
- **Coupons**: Dedicated `CourseCouponsManager` component (`components/admin/courses/CourseCouponsManager.tsx`).

### 2. Validation
- **Client-side**: Basic HTML form required constraints and trimming.
- **Server-side (`app/api/admin/courses/[id]/route.ts`)**:
  - `status`: Validated against `"DRAFT" | "PUBLISHED" | "ARCHIVED"`.
  - `metadataJson`: Validated via `JSON.parse` to ensure it is a JSON object.
  - **No Zod schema validation** is currently enforced on the internal fields of `metadataJson` (`teachers`, `schedule`, `faqs`, `aboutHighlights`).

### 3. Draft vs Published Workflow
- Governed by `Course.status` (`"DRAFT" | "PUBLISHED" | "ARCHIVED"`) and `Course.isPublished` (`boolean`).
- In `app/(dashboard)/courses/[slug]/page.tsx:210-220`, if a course is DRAFT, non-admin visitors receive a 404 (`notFound()`), while admins see an amber warning banner:
  `"Draft Course Preview — Only visible to Course Creator / Administrators"`.

### 4. Autosave
- **NO autosave** exists in `VideoCourseEditorClient.tsx`. All edits require clicking the sticky "Save Course Specifications" button (`handleSaveCourse`).
- In the sibling document editor (`CourseDetailView.tsx`), inline field blur triggers immediate server actions (`updateCourseInline`).

### 5. Preview
- Admin can click the "Student View" button in the sticky top header, which opens `/courses/[slug]` in a new tab (`VideoCourseEditorClient.tsx:960-970`).

### 6. Image & Media Upload
- **Handler**: `POST /api/admin/courses/upload` (`app/api/admin/courses/upload/route.ts`).
- **Storage**: Backed by `storeUpload` (`lib/security/upload-policy.ts`). It stores files to AWS S3 object storage when configured (`process.env.AWS_S3_BUCKET`), with fallback to local filesystem `/uploads/courses/`.
- **Limits**: Hard cap of 250 MB (`MAX_SIZE = 250 * 1024 * 1024`), magic byte sniffing, safe name generation.

### 7. Reordering
- **Video Course Studio (`VideoCourseEditorClient.tsx`)**: **NO drag-and-drop or reordering buttons**. Chapters and lessons are listed in creation / ascending order.
- **Document View (`CourseDetailView.tsx`)**: Up/Down chevron buttons invoke `reorderChapters` and `reorderLessons` server actions.

### 8. Permissions & Role Guards
- The studio page checks NextAuth session: role must be `ADMIN` or `TEACHER`.
- Enforced on backend at `app/api/admin/courses/[id]/route.ts:12`:
  ```ts
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 })
  }
  const access = await requireManagedCourse(user, id)
  if (access.response) return access.response
  ```
- Per Rule A8, teachers may only view and edit courses where `course.createdById === user.userId`. Admins have universal access.

---

## 6. Syllabus & PYQ Linkage

- **Syllabus Tree**: Stored as relational database records: `Course` -> `Chapter[]` (order, title) -> `Lesson[]` (order, title, durationText, videoUrl, isTrial, attachmentUrl).
- **PYQ Counts & Statistics** (e.g. "426 questions", "19 questions since the 48th"): **NOT FOUND in course files**. In the Content Engine and PYQ modules, paper question counts are calculated via `prisma.pyqQuestion.count()` or stored on `PyqPaper.totalQuestions` (`packages/shared/src/dto/content.dto.ts:18`).
- **Year Heat-bars**: **NOT FOUND in course files**. The only heat-bars in the codebase are learner study streaks in `components/dashboard/ProgressCharts.tsx`.
- **Hindi Version**: **NOT STORED for courses**. The `Course`, `Chapter`, and `Lesson` schemas have only single-language `title` and `content` fields. (Bilingual fields exist only in Test Series questions and Content Engine `hindiTwin`).
- **"In the course: History" linkage**: **NOT FOUND / MISSING**. There is no foreign key, relation, or metadata mapping linking PYQ topics or Content Engine taxonomy back to `Course` or `Chapter` IDs.

---

## 7. Lead Form ("Call me back")

- **Status on Course Detail Page**: **NOT FOUND**. The course detail page does not have a "Call me back" button.
- **Closest Existing Equivalent**: The **"Schedule Free Live Demo"** modal (`components/course/ScheduleDemoModal.tsx`):
  - **Endpoint**: `POST /api/courses/demo/book` (`app/api/courses/demo/book/route.ts`).
  - **Model**: `DemoBooking` (`prisma/schema.prisma:347`) and legacy `CourseDemoBooking`.
  - **Validation**:
    - Validates 10-digit Indian phone number via `normalizePhoneToE164`.
    - Checks slot existence, expiration (`isSlotExpired`), and audience capacity (`maxAudience`).
    - Disallows duplicate bookings via compound unique key `@@unique([studentId, slotId])`.
  - **Spam Protection & Rate Limiting**: Session-based deduplication and OTP flow for anonymous users.
  - **Admin View**: Leads & attendees are viewable via the Course Demo Analytics API (`/api/admin/courses/[id]/demo-report`) and in the live stage dashboard (`/courses/[slug]/demo`).
- **Alternative Lead Form**: `PyqLeadCapture` (`POST /api/admin/pyqs/leads`), used when students download PYQ PDF papers without an account. These leads are displayed to admins and teachers at `/admin/pyqs/leads` (`app/admin/pyqs/leads/page.tsx`).

---

## 8. i18n / Language

- **Course Bilingual Fields**: **NONE**. Neither `Course`, `Chapter`, nor `Lesson` has dual English/Hindi fields (`titleHi` or `descriptionHi` do NOT exist on course tables).
- **Language Selection**: Stored as a single string token:
  - Default: `"HINGLISH"`.
  - Stored in: `metadataJson.language` on the `Course` record or `batch.language` in `data/batches.json`.
- **Language Toggle**: **NOT IMPLEMENTED on Course Detail Page**. The page only displays the language name badge (e.g. "HINGLISH", "ENGLISH", "HINDI"). (Interactive language toggles exist exclusively in the CBT Mock Test runner `AttemptClient.tsx` and Content Engine `/hi/` routes).

---

## 9. Mobile

- **Mobile Screen**: `apps/mobile/src/app/courses/[id].tsx` (574 lines) and `apps/mobile/src/app/courses/[id]/lesson/[lessonId].tsx` (798 lines).
- **API Consumed**: Calls `api.getCourseDetail(id)` (`packages/shared/src/client.ts:361`), which hits `GET /api/v1/courses/:id` (`app/api/v1/courses/[id]/route.ts`).
- **Service Layer**: Backed by `getCourseDetail` in `lib/services/courses.service.ts:74-120`.
- **Shared Types**: Strongly typed via `@aspirantbook/shared`:
  - `CourseDetailDto`
  - `CourseSummaryDto`
  - `CourseChapterDto`
  - `CourseLessonItemDto`
- **Mobile Feature Parity Gap**:
  - The mobile API returns **ONLY** basic course details and the chapter/lesson curriculum tree.
  - Mobile does **NOT** receive `teachers`, `schedule`, `aboutHighlights`, `faqs`, or `demoSettings` because these fields are not part of `CourseDetailDto`.
  - Mobile purchases are redirected to web browser via `openWebUrl` (`apps/mobile/src/app/courses/[id].tsx:78`) to maintain Google Play Store / Apple App Store Reader App compliance (`allowPurchases: false`).

---

## 10. Responsive UI

- **2x2 Metric Grid on Mobile**:
  - **IMPLEMENTED** in `components/course/CourseBundleView.tsx:590-620`:
    ```tsx
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
    ```
    On screens `< 640px` (`sm`), it automatically renders as a 2-column x 2-row grid displaying Target, Medium, Mode, and Lectures.
  - **IMPLEMENTED** in `app/batches/[slug]/BatchDetailClient.tsx:369`:
    ```tsx
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-[#FAFBFD] p-5 rounded-2xl border border-gray-100">
    ```
  - **NOT PRESENT** in `CourseDetailView.tsx` (uses a single flex-wrap stat row).
- **Bottom-fixed Sticky CTA Bar on Mobile**:
  - **MISSING** in `components/course/CourseBundleView.tsx`. The buy card is rendered in the desktop right sidebar (`lg:col-span-4 sticky top-20`) which stacks underneath the entire curriculum on mobile.
  - **MISSING** in `app/(dashboard)/courses/[slug]/CourseDetailView.tsx`.
  - **MISSING** in `app/batches/[slug]/BatchDetailClient.tsx`.
  - *(Reference implementation exists in `components/books/BookDetailsClient.tsx:519`: `sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white p-3 safe-area-bottom`)*.

---

## 11. Tests & Tooling

### Test Execution Proof (Module-specific existing tests)

#### 1. Unit Test: Course Ownership & Lifecycle (`tests/unit/course-ownership.test.ts`)
```
$ npx tsx --test tests/unit/course-ownership.test.ts
▶ A8 course ownership
  ✔ admin can manage every course (0.874584ms)
  ✔ a teacher can only manage their own course (0.112917ms)
  ✔ legacy courses without a creator are admin-only for real teachers (0.089875ms)
  ✔ students and anonymous callers are always denied (0.0895ms)
  ✔ missing course or missing user id fails closed (0.072583ms)
  ✔ assertCanManageCourse distinguishes 401 from 403 (0.450167ms)
  ✔ courses with enrollments are archived, never deleted (0.161458ms)
  ✔ demo identities are never persisted as a creator (0.167625ms)
✔ A8 course ownership (3.009375ms)
ℹ tests 8
ℹ suites 1
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 400.027584
```

#### 2. API v1 Integration Test: Courses & Lessons Parity (`tests/api-v1-courses-learning.test.ts`)
```
$ npx tsx --test tests/api-v1-courses-learning.test.ts
▶ API v1: Courses, Lessons, My-Learning, and Tracks Parity
  ✔ GET /api/v1/courses returns published courses with stats (461.34375ms)
  ✔ GET /api/v1/courses/[id] returns curriculum chapters and trial status (230.099167ms)
  ✔ POST /api/v1/courses/[id]/enroll enrolls logged in student in free course (671.1495ms)
  ✔ GET /api/v1/courses/[id]/lessons/[lessonId] returns lesson content when enrolled (782.262541ms)
  ✔ GET /api/v1/courses/[id]/lessons/[lessonId] returns 403 when guest tries to access locked lesson (220.998958ms)
  ✔ POST /api/v1/courses/[id]/lessons/[lessonId]/progress marks lesson complete (296.861667ms)
  ✔ GET /api/v1/my-learning returns enrolled course with calculated progress (565.484416ms)
  ✔ GET /api/v1/career-tracks returns published career tracks (174.341334ms)
  ✔ GET /api/v1/career-tracks/[id] returns career track detail with courses (224.003125ms)
✔ API v1: Courses, Lessons, My-Learning, and Tracks Parity (6959.919583ms)
ℹ tests 9
ℹ suites 1
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7865.230541
```

### Git Status & Branch Invariants
- **Branch:** `fix/audit2-hardening`
- **Merge State:** No active merge (`.git/MERGE_HEAD` does not exist).
- **Recent Commits:**
  - `9f6c6b5` fix(A13): uniform v1 login errors, lockout parity, in-place refresh rotation, owner-only device unregister
  - `2e3aad6` fix(A9): tutorial import drafts, no free-trial lessons, atomic chapter replace
  - `84c3fb1` fix(A8): enforce course ownership, draft-on-create and archive instead of delete
  - `681262d` fix(A6): shared upload policy with magic bytes, safe names and object storage
  - `a2cdd52` fix(A12): zod allowlists for course, book and content-engine writes

### Database Migration Status
```
$ npx prisma migrate status
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-ap-south-1.pooler.supabase.com:5432"

24 migrations found in prisma/migrations

Database schema is up to date!
```

---

## 12. Top Risks

| Risk | Classification | Code Evidence & Impact Analysis |
|:---|:---:|:---|
| **Mobile App Contract Breakage** | **FACT** | `packages/shared/src/dto/content.dto.ts:167-200` defines `CourseDetailDto` and `CourseChapterDto`. If schema columns on `Course`, `Chapter`, or `Lesson` are renamed or if relation shapes change, mobile app runtime crashes on `apps/mobile/src/app/courses/[id].tsx:55`. |
| **Silent Tutorial Redirect Loop** | **FACT** | `app/(dashboard)/courses/[slug]/page.tsx:142-168` issues a `permanentRedirect('/tutorials/' + slug)` if `course.externalId` exists or `metadataJson.format === 'tutorial'`. Any course generalizing `metadataJson` must not set `format: "tutorial"`, or it will permanently redirect out of the course view. |
| **Enrollment & Razorpay Checkout Failure** | **FACT** | Checkout handlers (`app/api/checkout/course-info/route.ts:13`, `app/api/courses/enroll/route.ts:14`, `app/api/verify-payment/razorpay/route.ts:15`) link payments to `Course.id`. If a course slug or ID format is modified, webhook reconciliation will fail to create the student's `Enrollment` record. |
| **Archival vs Deletion Rule Violation** | **FACT** | Rule A8 enforced in `app/api/admin/courses/[id]/route.ts:107` and `lib/auth/course-access.ts`: courses with existing student enrollments must be archived (`status: ARCHIVED`, `isPublished: false`), never deleted. Direct DB deletes will cascade or violate foreign keys. |
| **Static Batch vs Database Course Divergence** | **FACT** | `app/(dashboard)/courses/[slug]/page.tsx:325` merges `prisma.course` with `data/batches.json`. If `Course.metadataJson` does not contain `teachers` or `schedule`, it silently falls back to `batch.*`. Editing in studio writes to `metadataJson`, which shadows `batches.json`. |
| **Loss of Media URLs on Re-serialization** | **FACT** | `VideoCourseEditorClient.tsx:460-500` re-serializes `metadataJson` on every save. Any unrecognized keys in existing courses' `metadataJson` (e.g. legacy `theme`, `curriculumConfig`) would be overwritten unless preserved via `...existingMeta`. |
| **Sub-nav Scroll-spy Breakage on Missing IDs** | **FACT** | `components/course/CourseBundleView.tsx:260-270` monitors element IDs `#syllabus`, `#about`, `#schedule`, `#teachers`, `#faqs`. If generalized sections are renamed or hidden without updating the tab list, scroll-spy encounters `null` rect errors. |
| **High Memory Footprint in Studio Client** | **GUESS** | `VideoCourseEditorClient.tsx` is 3,232 lines in a single React component with over 50 useState hooks and embedded modals. Adding more exam features without modularizing into sub-components could cause noticeable UI latency during typing. |

---

## 13. Questions for Owner

*The following questions cannot be resolved from codebase inspection alone and require owner direction:*

1. **Unification of Batches vs Courses**: Currently, `data/batches.json` holds live batch data (schedule, tiers, classTag), while Prisma `Course` holds video curriculum courses. Should the generalized Course Detail Studio store **100% of data in PostgreSQL (`Course` + `metadataJson`)** and deprecate `data/batches.json`, or should batches remain separate from courses?
2. **Missing Spec Features**: Several features from the prompt (Add-to-Calendar `.ics`, late-joiner banner, "Call me back" phone form, star rating breakdown, PYQ year heat-bars) do not exist in the course module today. Should these be built as new modular studio sections, or are some of them optional for MVP generalization?
3. **Syllabus & PYQ Linkage**: The prompt mentions PYQ counts (e.g. "426 questions", "19 questions since the 48th") and "In the course: History" links. There is currently no relationship between the `PyqPaper` / Content Engine database tables and `Course` chapters. What is the intended relationship model (e.g. linking `Chapter.id` or `Lesson.id` to a Content Engine `topicId` / `subjectId`)?
4. **Bilingual Course Curriculum**: The database currently has only single-language titles and descriptions for chapters and lessons. Does generalization require adding Hindi twins for course titles, chapter titles, and lesson content, or does the single `language` badge ("Hinglish" / "English" / "Hindi") suffice?
5. **Mobile Exposure**: Should the mobile app (`apps/mobile`) be enhanced to display the generalized course features (teachers, schedule, FAQs, about highlights), or should mobile continue showing only the clean chapter/lesson video list?
