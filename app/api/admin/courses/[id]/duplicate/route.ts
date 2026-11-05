import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/auth/rbac";
import { creatorIdFor } from "@/lib/auth/course-access";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUserContext();
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Access Denied: Teachers and Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const original = await prisma.course.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { order: "asc" },
          include: {
            chapters: {
              orderBy: { order: "asc" },
              include: { lessons: { orderBy: { order: "asc" } } },
            },
          },
        },
        syllabusPapers: {
          orderBy: { order: "asc" },
          include: { sections: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const copySuffix = Math.floor(1000 + Math.random() * 9000);
    const newSlug = `${original.slug}-copy-${copySuffix}`;

    const newCourse = await prisma.course.create({
      data: {
        title: `Copy of ${original.title}`,
        titleHi: original.titleHi ? `कॉपी: ${original.titleHi}` : null,
        slug: newSlug,
        subtitle: original.subtitle,
        subtitleHi: original.subtitleHi,
        description: original.description,
        descriptionHi: original.descriptionHi,
        thumbnailUrl: original.thumbnailUrl,
        price: original.price,
        originalPrice: original.originalPrice,
        discountPercent: original.discountPercent,
        technology: original.technology,
        difficulty: original.difficulty,
        isPremium: original.isPremium,
        isPublished: false, // Draft by default
        status: "DRAFT",
        createdById: creatorIdFor(user),
        metadataJson: original.metadataJson,
      },
    });

    const unitIdMap = new Map<string, string>();

    // Duplicate units, chapters, and lessons
    for (const unit of original.units) {
      const createdUnit = await prisma.courseUnit.create({
        data: {
          courseId: newCourse.id,
          title: unit.title,
          titleHi: unit.titleHi,
          tags: unit.tags,
          order: unit.order,
        },
      });
      unitIdMap.set(unit.id, createdUnit.id);

      for (const chapter of unit.chapters) {
        const createdChapter = await prisma.chapter.create({
          data: {
            courseId: newCourse.id,
            unitId: createdUnit.id,
            title: chapter.title,
            titleHi: chapter.titleHi,
            description: chapter.description,
            descriptionHi: chapter.descriptionHi,
            subtopics: chapter.subtopics,
            subtopicsHi: chapter.subtopicsHi,
            order: chapter.order,
            locked: chapter.locked,
            gateMode: chapter.gateMode,
          },
        });

        for (const lesson of chapter.lessons) {
          await prisma.lesson.create({
            data: {
              chapterId: createdChapter.id,
              title: lesson.title,
              titleHi: lesson.titleHi,
              type: lesson.type,
              videoUrl: lesson.videoUrl,
              durationText: lesson.durationText,
              order: lesson.order,
            },
          });
        }
      }
    }

    // Duplicate syllabus papers & sections
    for (const paper of original.syllabusPapers) {
      const createdPaper = await prisma.courseSyllabusPaper.create({
        data: {
          courseId: newCourse.id,
          key: paper.key,
          title: paper.title,
          titleHi: paper.titleHi,
          marks: paper.marks,
          durationMinutes: paper.durationMinutes,
          introText: paper.introText,
          introTextHi: paper.introTextHi,
          order: paper.order,
        },
      });

      for (const section of paper.sections) {
        const newUnitId = section.unitId ? unitIdMap.get(section.unitId) || null : null;
        await prisma.courseSyllabusSection.create({
          data: {
            paperId: createdPaper.id,
            title: section.title,
            titleHi: section.titleHi,
            subtopics: section.subtopics,
            subtopicsHi: section.subtopicsHi,
            order: section.order,
            unitId: newUnitId,
            pyqSubject: section.pyqSubject,
            pyqTopic: section.pyqTopic,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      courseId: newCourse.id,
      slug: newCourse.slug,
    });
  } catch (error: any) {
    console.error("Duplicate course error:", error);
    return NextResponse.json({ error: error.message || "Failed to duplicate course" }, { status: 500 });
  }
}
