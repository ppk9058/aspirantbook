import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const prisma = new PrismaClient({ datasourceUrl: env.TEST_DATABASE_URL })

export const TEST_RESP_PREFIX = "TEST-RESP-"

export async function cleanupSeoResponsiveFixtures() {
  console.log("Cleaning up any existing TEST-RESP fixtures...")
  // 1. Delete questions
  await prisma.contentEngineQuestion.deleteMany({
    where: {
      OR: [
        { shortId: { startsWith: "resp" } },
        { slug: { startsWith: "test-resp-" } },
        { exam: { startsWith: "TEST-RESP-" } },
      ],
    },
  })

  // 2. Delete test series & tests
  const series = await prisma.examSeries.findMany({
    where: { slug: { startsWith: "test-resp-" } },
    select: { id: true },
  })
  if (series.length > 0) {
    const sIds = series.map((s) => s.id)
    await prisma.examQuestion.deleteMany({
      where: { section: { test: { seriesId: { in: sIds } } } },
    })
    await prisma.examSection.deleteMany({
      where: { test: { seriesId: { in: sIds } } },
    })
    await prisma.examTest.deleteMany({
      where: { seriesId: { in: sIds } },
    })
    await prisma.examSeries.deleteMany({
      where: { id: { in: sIds } },
    })
  }

  // 3. Delete PYQ categories & papers
  await prisma.pyqPaper.deleteMany({
    where: { category: { slug: { startsWith: "test-resp-" } } },
  })
  await prisma.pyqCategory.deleteMany({
    where: { slug: { startsWith: "test-resp-" } },
  })

  // 4. Delete Courses & Tutorials
  const courses = await prisma.course.findMany({
    where: { slug: { startsWith: "test-resp-" } },
    select: { id: true },
  })
  if (courses.length > 0) {
    const cIds = courses.map((c) => c.id)
    await prisma.lesson.deleteMany({
      where: { chapter: { courseId: { in: cIds } } },
    })
    await prisma.chapter.deleteMany({
      where: { courseId: { in: cIds } },
    })
    await prisma.course.deleteMany({
      where: { id: { in: cIds } },
    })
  }

  // 5. Delete CA tests
  await prisma.examTest.deleteMany({
    where: { id: { startsWith: "test-resp-" } },
  })

  console.log("✓ Cleanup complete.")
}

export async function seedSeoResponsiveFixtures() {
  await cleanupSeoResponsiveFixtures()
  console.log("Seeding fresh TEST-RESP fixtures...")

  // Fixture 1: Long English question with an image
  await prisma.contentEngineQuestion.create({
    data: {
      shortId: "resp01img",
      slug: "test-resp-01-long-english-question-with-image",
      textHash: "hash-resp01img",
      q: "Consider the following detailed hydrological and geological features of the Indo-Gangetic Brahmaputra alluvial plains. The depositional patterns observed along the southern tributaries indicate seasonal fluvial shifts and distinct grain-size gradients across the terrace sequences.\n\n![Indo-Gangetic Plain Geological Cross-Section](/images/placeholder-course.svg)\n\nWhich of the following statements correctly characterizes the Tarai-Bhabar transition zone in this landscape?",
      options: [
        "The Bhabar zone comprises unassorted coarse boulders where streams disappear underground.",
        "The Tarai zone is an excessively dry upland zone with zero marshy vegetation.",
        "Both Bhabar and Tarai are composed exclusively of Pleistocene basaltic lava flows.",
        "Fluvial sedimentation is absent across the entire Brahmaputra delta.",
      ],
      answer: "The Bhabar zone comprises unassorted coarse boulders where streams disappear underground.",
      answerIndex: 0,
      explanation: "The Bhabar is a narrow porous gravel belt lying along the foot of the Shivalik hills where torrential Himalayan rivers deposit heavy boulders and cobbles, causing streams to seep subterraneanly before emerging in the marshy Tarai belt.",
      sub: "Geography",
      top: "Geomorphology",
      exam: "UPSC CSE",
      year: "2024",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
    },
  })

  // Fixture 2: Hindi (Devanagari) question with very long words
  await prisma.contentEngineQuestion.create({
    data: {
      shortId: "resp02hi",
      slug: "test-resp-02-hindi-question-long-words",
      textHash: "hash-resp02hi",
      q: "Consider the following linguistic structure in Hindi literature:",
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: "Option A",
      answerIndex: 0,
      sub: "Hindi Literature",
      top: "Grammar & Vocabulary",
      exam: "BPSC",
      year: "2024",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
      translations: {
        create: [
          {
            lang: "hi",
            q: "निम्नलिखित दीर्घसामासिकपदविचारधारा एवं प्रातिपदिकसंरचना के सन्दर्भ में सम्पूर्णानन्दसंस्कृतविश्वविद्यालयीय पाण्डुलिपियों में उल्लिखित अन्ताराष्ट्रियव्यापारसम्बन्धविधेयक के संवैधानिकसंशोधनअधिनियमसंशोधनार्थ नियमों का विश्लेषण करते हुए शुद्ध विकल्प का चयन कीजिए:",
            options: [
              "व्याकरणसम्मतदीर्घसमासयोजनाविधान",
              "अप्रत्यक्षकारकसम्बन्धातिशयोक्ति",
              "सार्वनामिकविशेषणपदपरिवर्तन",
              "प्रातिपदिकार्थलिङ्गपरिमाणवचनमात्रेप्रथमा",
            ],
            explanation: "सम्पूर्णानन्दसंस्कृतविश्वविद्यालयीय शोधग्रन्थों के अनुसार प्रातिपदिकसंज्ञा तथा समासगत पदसंरचना के विशिष्ट नियमों के आधार पर व्याकरणसम्मतदीर्घसमासयोजनाविधान सर्वाधिक उपयुक्त है।",
            top: "व्याकरण और शब्दावली",
            isReviewed: true,
          },
        ],
      },
    },
  })

  // Fixture 3: Question with a table or code block
  await prisma.contentEngineQuestion.create({
    data: {
      shortId: "resp03tbl",
      slug: "test-resp-03-question-with-table-and-code",
      textHash: "hash-resp03tbl",
      q: "Analyze the following relational database schema execution plan and query structure:\n\n| Transaction ID | Isolation Level | Read Lock Type | Concurrency Penalty |\n| --- | --- | --- | --- |\n| TXN_101 | SERIALIZABLE | Exclusive Range | High Contention |\n| TXN_102 | READ COMMITTED | Shared Record | Low Contention |\n| TXN_103 | REPEATABLE READ | Snapshot Scan | Moderate MVCC |\n\n```sql\nSELECT t.transaction_id, count(l.lock_id)\nFROM db_transactions t\nJOIN db_locks l ON t.id = l.transaction_id\nWHERE t.isolation_level = 'SERIALIZABLE'\nGROUP BY t.transaction_id\nHAVING count(l.lock_id) > 100;\n```\n\nWhich isolation level guarantees the prevention of phantom reads without mandatory table-level locking?",
      options: [
        "SNAPSHOT Isolation with optimistic concurrency control",
        "READ UNCOMMITTED with dirty read tolerance",
        "READ COMMITTED with non-repeatable read acceptance",
        "Exclusive table locking mode only",
      ],
      answer: "SNAPSHOT Isolation with optimistic concurrency control",
      answerIndex: 0,
      explanation: "Snapshot isolation uses Multi-Version Concurrency Control (MVCC) to provide consistent point-in-time reads, preventing phantom reads for query transactions without blocking concurrent writes.",
      sub: "Computer Science",
      top: "Database Systems",
      exam: "UPSC CSE",
      year: "2024",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
    },
  })

  // Fixture 4: Question with a very long slug / title
  await prisma.contentEngineQuestion.create({
    data: {
      shortId: "resp04lng",
      slug: "test-resp-04-exceptionally-long-slug-designed-to-verify-responsive-wrapping-and-prevent-horizontal-page-overflow-on-mobile-phone-viewports-without-layout-breakage-2024",
      textHash: "hash-resp04lng",
      q: "This is an exceptionally comprehensive and elongated question title created specifically for responsive layout stress-testing in the SEO engine to guarantee that multi-line headings wrap properly without causing horizontal scrollbars on 360px viewports across mobile devices.",
      options: [
        "Comprehensive administrative evaluation framework",
        "Decentralized bureaucratic operational mechanism",
        "Structural functionalism in comparative administration",
        "New Public Management outcome accountability",
      ],
      answer: "Comprehensive administrative evaluation framework",
      answerIndex: 0,
      sub: "Public Administration",
      top: "Administrative Theory",
      exam: "UPSC CSE",
      year: "2024",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
    },
  })

  // Fixture 5: Empty Hub (PYQ Category with 0 papers)
  await prisma.pyqCategory.create({
    data: {
      id: "test-resp-empty-cat-id",
      name: "Test Empty PYQ Exam Hub",
      slug: "test-resp-empty-hub",
      description: "An empty exam category for responsive empty state validation.",
      badgeColor: "#64748B",
      isPublished: true,
      order: 99,
    },
  })

  // Fixture 6: Page with 100+ items (105 questions under TEST-RESP-BULK-EXAM / Bulk Studies)
  console.log("Seeding 105 bulk questions...")
  const bulkData = []
  for (let i = 1; i <= 105; i++) {
    const pad = String(i).padStart(3, "0")
    bulkData.push({
      shortId: `respb${pad}`,
      slug: `test-resp-bulk-q-${pad}`,
      textHash: `hash-resp-bulk-${pad}`,
      q: `Bulk Question Item ${i}: Which constitutional body is responsible for conducting elections to the local municipal bodies?`,
      options: [
        "State Election Commission",
        "Election Commission of India",
        "District Collector",
        "Municipal Commissioner",
      ],
      answer: "State Election Commission",
      answerIndex: 0,
      sub: "Bulk General Studies",
      top: "Polity",
      exam: "TEST-RESP-BULK-EXAM",
      year: "2024",
      status: "PUBLISHED",
      isPublished: true,
      isVerified: true,
    })
  }
  await prisma.contentEngineQuestion.createMany({ data: bulkData })

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  const adminId = adminUser?.id || "cmvhcrtnv0001xpb76uya9ht9"

  // Fixture 7: Test Series with 1 Test for /test-series/[id] and /test-series/[id]/print
  const series = await prisma.examSeries.create({
    data: {
      id: "test-resp-series-id",
      title: "Test Series Responsive Benchmark 2026",
      slug: "test-resp-series",
      examName: "UPSC CSE",
      category: "Civil Services",
      createdById: adminId,
      description: "A benchmark test series for responsive UI and print testing.",
      isPublished: true,
      isArchived: false,
    },
  })

  const test = await prisma.examTest.create({
    data: {
      id: "test-resp-test-id",
      title: "Full Mock Test 01 (Responsive Spec)",
      seriesId: series.id,
      createdById: adminId,
      testType: "FULL_MOCK",
      durationMinutes: 120,
      totalMarks: 200,
      accessMode: "FREE",
      isPublished: true,
    },
  })

  const section = await prisma.examSection.create({
    data: {
      id: "test-resp-sec-id",
      title: "General Studies Paper I",
      testId: test.id,
      order: 1,
    },
  })

  await prisma.examQuestion.create({
    data: {
      id: "test-resp-eq-id",
      sectionId: section.id,
      questionEn: "Which of the following mountain ranges separates Europe from Asia?",
      optionAEn: "Ural Mountains",
      optionBEn: "Alps",
      optionCEn: "Atlas Mountains",
      optionDEn: "Appalachian Mountains",
      correctOption: "A",
      explanationEn: "The Ural Mountains run approximately north-south through western Russia and form the conventional boundary between Europe and Asia.",
      order: 1,
      positiveMarks: 2,
    },
  })

  // Fixture 8: Tutorial with lessons for /tutorials/[slug]
  const tutCourse = await prisma.course.create({
    data: {
      id: "test-resp-tut-id",
      title: "Responsive AI Engineering Tutorial 2026",
      slug: "test-resp-tutorial",
      description: "A structured text-based reading tutorial verifying mobile responsiveness.",
      difficulty: "BEGINNER",
      prerequisites: [],
      status: "PUBLISHED",
      isPublished: true,
      price: 0,
    },
  })

  const tutChapter = await prisma.chapter.create({
    data: {
      id: "test-resp-tut-chap-id",
      title: "Introduction to Responsive Verification",
      courseId: tutCourse.id,
      order: 1,
    },
  })

  await prisma.lesson.create({
    data: {
      id: "test-resp-tut-les-id",
      title: "Viewport Breakpoints and Touch Targets",
      chapterId: tutChapter.id,
      type: "TUTORIAL",
      order: 1,
      content: "This lesson covers 360px viewport testing, 44px tap targets, and typography.",
      isTrial: true,
    },
  })

  // Fixture 9: Course for /courses/[slug]
  await prisma.course.create({
    data: {
      id: "test-resp-course-id",
      title: "Responsive Mastery Video Course 2026",
      slug: "test-resp-course",
      description: "A comprehensive video course for modern frontend developers.",
      difficulty: "BEGINNER",
      prerequisites: [],
      status: "PUBLISHED",
      isPublished: true,
      price: 999,
    },
  })

  // Fixture 10: Current Affairs Quiz for /current-affairs-quizzes/[slug]
  const caSeries = await prisma.examSeries.findFirst({
    where: { slug: "current-affairs-system-series" },
  })
  const caTest = await prisma.examTest.create({
    data: {
      id: "test-resp-ca-test-id",
      title: "Weekly National Current Affairs Round 2026",
      seriesId: caSeries ? caSeries.id : series.id,
      createdById: adminId,
      testType: "CURRENT_AFFAIRS",
      durationMinutes: 30,
      totalMarks: 50,
      accessMode: "FREE",
      isPublished: true,
    },
  })
  const caSec = await prisma.examSection.create({
    data: {
      id: "test-resp-ca-sec-id",
      title: "Current Affairs Section",
      testId: caTest.id,
      order: 1,
    },
  })
  await prisma.examQuestion.create({
    data: {
      id: "test-resp-ca-eq-id",
      sectionId: caSec.id,
      questionEn: "Which Indian port recently handled the highest container volume?",
      optionAEn: "Jawaharlal Nehru Port (JNPA)",
      optionBEn: "Mundra Port",
      optionCEn: "Chennai Port",
      optionDEn: "Kolkata Port",
      correctOption: "A",
      explanationEn: "JNPA handled record TEUs in the latest fiscal cycle.",
      order: 1,
      positiveMarks: 2,
    },
  })

  // Fixture 11: PYQ Category with paper for /pyqs/[examId]
  const pyqCat = await prisma.pyqCategory.create({
    data: {
      id: "test-resp-pyq-cat-id",
      name: "Test Active PYQ Category",
      slug: "test-resp-pyq-cat",
      description: "A PYQ exam category with real papers.",
      badgeColor: "#10B981",
      isPublished: true,
      order: 1,
    },
  })
  await prisma.pyqPaper.create({
    data: {
      id: "test-resp-paper-id",
      title: "2024 Prelims General Studies Paper",
      slug: "test-resp-paper",
      categoryId: pyqCat.id,
      year: 2024,
      totalQuestions: 100,
      totalMarks: 200,
      paperPdfUrl: "/sample.pdf",
      status: "PUBLISHED",
      accessType: "FREE",
    },
  })

  console.log("✓ All TEST-RESP fixtures seeded successfully!")
}

if (require.main === module || process.argv[1]?.includes("seed-seo-responsive-fixtures")) {
  const isCleanupOnly = process.argv.includes("--cleanup")
  if (isCleanupOnly) {
    cleanupSeoResponsiveFixtures()
      .then(() => prisma.$disconnect())
      .catch((e) => {
        console.error(e)
        process.exit(1)
      })
  } else {
    seedSeoResponsiveFixtures()
      .then(() => prisma.$disconnect())
      .catch((e) => {
        console.error(e)
        process.exit(1)
      })
  }
}
