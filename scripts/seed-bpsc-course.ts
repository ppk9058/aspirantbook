import { prisma } from "../lib/prisma"

async function main() {
  console.log("Seeding 72nd BPSC Prelims Current Affairs Course matching Screenshots...")

  const slug = "72nd-bpsc-prelims-current-affairs"

  const course = await prisma.course.upsert({
    where: { slug },
    update: {
      title: "72nd BPSC - Prelims Current Affairs",
      description: "Complete coverage of Monthly Current Affairs (July 2025 - June 2026), Bihar Special, Economic Survey, Budget, and comprehensive PDF study notes in English and Hindi.",
      thumbnailUrl: "/placeholder-course.jpg",
      difficulty: "INTERMEDIATE",
      duration: 180,
      rating: 4.9,
      enrollmentCount: 3840,
      isPremium: true,
      isPublished: true,
      status: "PUBLISHED",
      price: 3299,
      originalPrice: 4499,
      discountPercent: 27,
      couponCode: "OFF50",
      couponDiscount: 50,
      expiresAt: "Oct 30, 2026",
      hasTrialLesson: true,
    },
    create: {
      title: "72nd BPSC - Prelims Current Affairs",
      slug,
      description: "Complete coverage of Monthly Current Affairs (July 2025 - June 2026), Bihar Special, Economic Survey, Budget, and comprehensive PDF study notes in English and Hindi.",
      thumbnailUrl: "/placeholder-course.jpg",
      difficulty: "INTERMEDIATE",
      duration: 180,
      rating: 4.9,
      enrollmentCount: 3840,
      isPremium: true,
      isPublished: true,
      status: "PUBLISHED",
      price: 3299,
      originalPrice: 4499,
      discountPercent: 27,
      couponCode: "OFF50",
      couponDiscount: 50,
      expiresAt: "Oct 30, 2026",
      hasTrialLesson: true,
    },
  })

  // Remove old chapters to seed cleanly
  await prisma.chapter.deleteMany({ where: { courseId: course.id } })

  const chaptersData = [
    {
      title: "Link to Join Paid Telegram Group",
      order: 1,
      lessons: [
        {
          title: "Link",
          type: "READING" as const,
          order: 1,
          attachmentType: "ARTICLE",
          attachmentName: "Telegram Private VIP Group Invite",
          attachmentUrl: "https://t.me/bpsc_vip_current_affairs",
          content: "Welcome to the 72nd BPSC Prelims Current Affairs VIP batch. Click the attachment to join the exclusive faculty doubt and daily quiz Telegram group.",
          isTrial: false,
        },
      ],
    },
    {
      title: "Yearly Current Affairs Lectures",
      order: 2,
      lessons: [
        {
          title: "Important Topics",
          type: "READING" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "High Yield 72nd BPSC Topics.pdf",
          attachmentUrl: "/uploads/pyq/bpsc-69th-prelims-2024.pdf",
          content: "Master list of high-priority national, international, and state topics with maximum recurrence in past 5 BPSC prelims papers.",
          isTrial: false,
        },
        {
          title: "Polity CA",
          type: "READING" as const,
          order: 2,
          attachmentType: "PDF",
          attachmentName: "Polity & Governance Current Affairs 2025-26.pdf",
          attachmentUrl: "/uploads/pyq/bpsc-69th-solutions-2024.pdf",
          content: "Constitutional amendments, key Supreme Court verdicts, electoral reforms, and Bihar state assembly bills.",
          isTrial: false,
        },
        {
          title: "Lesson - 9",
          type: "VIDEO" as const,
          order: 3,
          attachmentType: "LIVE",
          attachmentName: "Live Doubt Resolution & Practice Session",
          durationText: "1h 15m 00s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
        {
          title: "Auditor paper discussion",
          type: "VIDEO" as const,
          order: 4,
          attachmentType: "VIDEO",
          attachmentName: "BPSC Auditor Official Paper Solutions.pdf",
          durationText: "1h 56m 33s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
      ],
    },
    {
      title: "Budget",
      order: 3,
      lessons: [
        {
          title: "Budget 2026-27",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "Union & Bihar Budget Summary Charts.pdf",
          attachmentUrl: "/uploads/pyq/bpsc-69th-solutions-2024.pdf",
          durationText: "1h 45m 20s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          content: "Comprehensive deep-dive into Union Budget 2026-27 and Bihar State Budget 2026-27. Sectoral allocations, capital expenditure, fiscal deficit targets, and 7 Nishchay Phase 2 schemes.",
          isTrial: false,
        },
      ],
    },
    {
      title: "Monthly Lectures",
      order: 4,
      lessons: [
        {
          title: "July 2025 Current Affairs (Part 1)",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "July 2025 Comprehensive Digest.pdf",
          attachmentUrl: "/uploads/pyq/bpsc-69th-prelims-2024.pdf",
          durationText: "1h 32m 10s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          content: "Free Trial Lesson: In-depth monthly review covering Science & Technology, Defence, National Awards, and Bihar State developments.",
          isTrial: true, // 1 TRIAL LESSON!
        },
        {
          title: "August 2025 Current Affairs",
          type: "VIDEO" as const,
          order: 2,
          attachmentType: "PDF",
          attachmentName: "August 2025 Magazine Notes.pdf",
          durationText: "1h 40m 15s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
        {
          title: "September 2025 Current Affairs",
          type: "VIDEO" as const,
          order: 3,
          attachmentType: "PDF",
          attachmentName: "September 2025 Highlights.pdf",
          durationText: "1h 28m 45s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
      ],
    },
    {
      title: "Economic Survey",
      order: 5,
      lessons: [
        {
          title: "Bihar Economic Survey Analysis",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "Bihar Economic Survey Executive Summary.pdf",
          durationText: "1h 50m 00s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
        {
          title: "Union Economic Survey Key Data",
          type: "READING" as const,
          order: 2,
          attachmentType: "PDF",
          attachmentName: "Macroeconomic Survey Indicators.pdf",
          isTrial: false,
        },
      ],
    },
    {
      title: "Bihar Special",
      order: 6,
      lessons: [
        {
          title: "Bihar Government Welfare Schemes 2025-26",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "Bihar Govt Schemes Dossier.pdf",
          durationText: "1h 18m 40s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
      ],
    },
    {
      title: "Modern History",
      order: 7,
      lessons: [
        {
          title: "Bihar in India's National Movement (1857-1947)",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "Champaran to Quit India Timeline.pdf",
          durationText: "2h 05m 12s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
      ],
    },
    {
      title: "National CA (Hindi)",
      order: 8,
      lessons: [
        {
          title: "राष्ट्रीय समसामयिकी सम्पूर्ण संकलन (हिंदी माध्यम)",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "National CA Hindi Master Notes.pdf",
          durationText: "1h 35m 00s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
      ],
    },
    {
      title: "Bihar Geography",
      order: 9,
      lessons: [
        {
          title: "Physical Geography, Rivers & Drainage System of Bihar",
          type: "VIDEO" as const,
          order: 1,
          attachmentType: "PDF",
          attachmentName: "Bihar River Basin & Canal Network Map.pdf",
          durationText: "1h 25m 30s",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          isTrial: false,
        },
        {
          title: "Soil, Climate & Agricultural Agro-Climatic Zones",
          type: "READING" as const,
          order: 2,
          attachmentType: "PDF",
          attachmentName: "Bihar Agro-Climatic Zones & Crops.pdf",
          isTrial: false,
        },
      ],
    },
  ]

  for (const ch of chaptersData) {
    const createdChapter = await prisma.chapter.create({
      data: {
        title: ch.title,
        order: ch.order,
        courseId: course.id,
      },
    })

    for (const l of ch.lessons) {
      await prisma.lesson.create({
        data: {
          title: l.title,
          type: l.type,
          order: l.order,
          attachmentType: l.attachmentType,
          attachmentName: l.attachmentName,
          attachmentUrl: (l as any).attachmentUrl || null,
          durationText: (l as any).durationText || null,
          videoUrl: (l as any).videoUrl || null,
          content: (l as any).content || null,
          isTrial: l.isTrial,
          chapterId: createdChapter.id,
        },
      })
    }
  }

  console.log("Successfully seeded 72nd BPSC course with 9 chapters and full lessons!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
