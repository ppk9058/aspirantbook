import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Only Teachers and Admins can create courses" }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      titleHi,
      subtitle,
      subtitleHi,
      slug: customSlug,
      technology = "",
      difficulty = "BEGINNER",
      description = "",
      descriptionHi,
      price = 0,
      originalPrice = 0,
      discountPercent = 0,
      couponCode = null,
      couponDiscount = 0,
      expiresAt = null,
      isPremium = false,
      hasTrialLesson = false,
      status = "DRAFT",
      thumbnailUrl = "/placeholder-course.svg",
      theme,
      metadataJson,
      units,
      chapters,
      syllabusPapers,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 })
    }

    // Slug calculation
    let baseSlug = (customSlug || title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    if (!baseSlug) baseSlug = `course-${Date.now()}`

    let slug = baseSlug
    const existing = await prisma.course.findUnique({ where: { slug } })
    if (existing) {
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    }

    const isPublished = status === "PUBLISHED"
    const parsedPrice = Number(price) || 0
    const parsedOriginalPrice = Number(originalPrice) || 0

    // Create course record
    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        titleHi: titleHi ? titleHi.trim() : null,
        subtitle: subtitle ? subtitle.trim() : null,
        subtitleHi: subtitleHi ? subtitleHi.trim() : null,
        slug,
        description: description ? description.trim() : "",
        descriptionHi: descriptionHi ? descriptionHi.trim() : null,
        technology: technology ? technology.trim() : "",
        difficulty: (difficulty as any) || "BEGINNER",
        price: parsedPrice,
        originalPrice: parsedOriginalPrice,
        discountPercent: Number(discountPercent) || 0,
        couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
        couponDiscount: Number(couponDiscount) || 0,
        expiresAt: expiresAt ? String(expiresAt).trim() : null,
        hasTrialLesson: Boolean(hasTrialLesson),
        isPremium: Boolean(isPremium),
        status: (status as any) || "DRAFT",
        isPublished,
        schemaVersion: 2,
        thumbnailUrl: thumbnailUrl || "/placeholder-course.svg",
        theme: theme || null,
        metadataJson: metadataJson
          ? typeof metadataJson === "string"
            ? metadataJson
            : JSON.stringify(metadataJson)
          : null,
      },
    })

    // Map to hold created unit ids so syllabus sections or chapters can link to them
    const createdUnitIds: string[] = []

    // If units with nested themes and lectures were provided
    if (Array.isArray(units) && units.length > 0) {
      for (let uIdx = 0; uIdx < units.length; uIdx++) {
        const u = units[uIdx]
        const unitRecord = await prisma.courseUnit.create({
          data: {
            courseId: course.id,
            title: u.title || `Unit ${uIdx + 1}`,
            titleHi: u.titleHi || null,
            tags: Array.isArray(u.tags) ? u.tags : u.tag ? [u.tag] : [],
            order: u.order ?? (uIdx + 1),
          },
        })
        createdUnitIds.push(unitRecord.id)

        // Nested themes (chapters) inside unit
        const themes = u.themes || u.chapters || []
        if (Array.isArray(themes)) {
          for (let tIdx = 0; tIdx < themes.length; tIdx++) {
            const th = themes[tIdx]
            const chapterRecord = await prisma.chapter.create({
              data: {
                courseId: course.id,
                unitId: unitRecord.id,
                title: th.title || `Theme ${tIdx + 1}`,
                titleHi: th.titleHi || null,
                subtopics: Array.isArray(th.subtopics) ? th.subtopics : [],
                subtopicsHi: Array.isArray(th.subtopicsHi) ? th.subtopicsHi : [],
                order: th.order ?? (tIdx + 1),
              },
            })

            // Nested lectures inside theme
            const lectures = th.lectures || th.lessons || []
            if (Array.isArray(lectures)) {
              for (let lIdx = 0; lIdx < lectures.length; lIdx++) {
                const lec = lectures[lIdx]
                let scheduledAtDate: Date | null = null
                if (lec.scheduledAt) {
                  const d = new Date(lec.scheduledAt)
                  if (!Number.isNaN(d.getTime())) scheduledAtDate = d
                }

                await prisma.lesson.create({
                  data: {
                    chapterId: chapterRecord.id,
                    title: lec.title || `Lecture ${lIdx + 1}`,
                    titleHi: lec.titleHi || null,
                    type: (lec.type as any) || "VIDEO",
                    order: lec.order ?? (lIdx + 1),
                    duration: lec.durationMin || lec.duration || 60,
                    isTrial: Boolean(lec.isTrial || lec.freePreview),
                    videoUrl: lec.videoUrl || null,
                    scheduledAt: scheduledAtDate,
                    attachmentName: lec.attachmentName || null,
                    attachmentUrl: lec.attachmentUrl || null,
                    attachmentType: lec.attachmentType || null,
                  },
                })
              }
            }
          }
        }
      }
    } else if (Array.isArray(chapters) && chapters.length > 0) {
      // Standalone chapters
      for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
        const ch = chapters[cIdx]
        const chapterRecord = await prisma.chapter.create({
          data: {
            courseId: course.id,
            title: ch.title || `Section ${cIdx + 1}`,
            titleHi: ch.titleHi || null,
            subtopics: Array.isArray(ch.subtopics) ? ch.subtopics : [],
            subtopicsHi: Array.isArray(ch.subtopicsHi) ? ch.subtopicsHi : [],
            order: ch.order ?? (cIdx + 1),
          },
        })

        const lessons = ch.lessons || ch.lectures || []
        if (Array.isArray(lessons)) {
          for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
            const l = lessons[lIdx]
            let scheduledAtDate: Date | null = null
            if (l.scheduledAt) {
              const d = new Date(l.scheduledAt)
              if (!Number.isNaN(d.getTime())) scheduledAtDate = d
            }

            await prisma.lesson.create({
              data: {
                chapterId: chapterRecord.id,
                title: l.title || `Lesson ${lIdx + 1}`,
                titleHi: l.titleHi || null,
                type: (l.type as any) || "VIDEO",
                order: l.order ?? (lIdx + 1),
                duration: l.duration || 60,
                isTrial: Boolean(l.isTrial),
                videoUrl: l.videoUrl || null,
                scheduledAt: scheduledAtDate,
              },
            })
          }
        }
      }
    }

    // If syllabus papers were provided
    if (Array.isArray(syllabusPapers) && syllabusPapers.length > 0) {
      for (let pIdx = 0; pIdx < syllabusPapers.length; pIdx++) {
        const p = syllabusPapers[pIdx]
        const paperRecord = await prisma.courseSyllabusPaper.create({
          data: {
            courseId: course.id,
            key: p.key || `PAPER_${pIdx + 1}`,
            title: p.title,
            titleHi: p.titleHi || null,
            marks: p.marks ? Number(p.marks) : null,
            durationMinutes: p.durationMinutes ? Number(p.durationMinutes) : null,
            introText: p.introText || p.introQuote || null,
            introTextHi: p.introTextHi || p.introQuoteHi || null,
            order: p.order ?? (pIdx + 1),
          },
        })

        if (Array.isArray(p.sections)) {
          for (let sIdx = 0; sIdx < p.sections.length; sIdx++) {
            const sec = p.sections[sIdx]
            // If unitIndex specified, link to that created unit
            let linkedUnitId: string | null = null
            if (typeof sec.unitIndex === "number" && createdUnitIds[sec.unitIndex]) {
              linkedUnitId = createdUnitIds[sec.unitIndex]
            } else if (sec.unitId) {
              linkedUnitId = sec.unitId
            }

            await prisma.courseSyllabusSection.create({
              data: {
                paperId: paperRecord.id,
                title: sec.title,
                titleHi: sec.titleHi || null,
                subtopics: Array.isArray(sec.subtopics) ? sec.subtopics : [],
                subtopicsHi: Array.isArray(sec.subtopicsHi) ? sec.subtopicsHi : [],
                unitId: linkedUnitId,
                pyqSubject: sec.pyqSubject ? sec.pyqSubject.trim() : null,
                pyqTopic: sec.pyqTopic ? sec.pyqTopic.trim() : null,
                order: sec.order ?? (sIdx + 1),
              },
            })
          }
        }
      }
    }

    const fullCourse = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        chapters: {
          include: { lessons: true },
        },
      },
    })

    return NextResponse.json(fullCourse, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/courses error:", error)
    return NextResponse.json({ error: error.message || "Failed to create course" }, { status: 500 })
  }
}
