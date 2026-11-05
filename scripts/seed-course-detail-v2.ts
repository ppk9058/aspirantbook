import { PrismaClient, Difficulty, LessonType, CourseStatus } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";
import { BPSC_MAINS_DEMOLISH_TEMPLATE, SSC_CGL_TIER_2_TEMPLATE } from "../lib/courses/templates";

// Ensure environment points to test DB
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

assertTestDb();

const prisma = new PrismaClient();

async function seedCourseFromTemplate(template: any) {
  console.log(`Seeding course: ${template.slug}...`);

  const metadataJson = JSON.stringify({
    schemaVersion: 2,
    brand: template.brand || "AspirantBook",
    subtitle: template.subtitle,
    subtitleHi: template.subtitleHi,
    theme: template.theme,
    teachers: template.teachers,
    stats: template.stats,
    heroMetrics: template.stats?.map((s: any) => ({
      value: s.value,
      valueHi: s.valueHi,
      label: s.caption,
      labelHi: s.captionHi,
    })),
    lateJoinNote: template.lateJoinNote,
    lateJoinerTemplate: template.lateJoinNote?.text,
    lateJoinerTemplateHi: template.lateJoinNote?.textHi,
    badges: template.badges,
    pillTags: template.badges?.map((b: any) => b.label),
    pillTagsHi: template.badges?.map((b: any) => b.labelHi),
    goalLabel: template.goalLabel,
    goalLabelHi: template.goalLabelHi,
    whatYouGet: template.whatYouGet,
    howItWorks: template.howItWorks,
    tabsEnabled: template.tabsEnabled,
    faqs: template.faqs?.map((f: any) => ({
      question: f.q,
      questionHi: f.qHi,
      answer: f.a,
      answerHi: f.aHi,
    })),
    enrollCtaLabel: template.enrollCtaLabel,
    enrollCtaLabelHi: template.enrollCtaLabelHi,
    enrollHelperText: template.enrollHelperText,
    enrollHelperTextHi: template.enrollHelperTextHi,
  });

  const course = await prisma.course.upsert({
    where: { slug: template.slug },
    update: {
      title: template.title,
      titleHi: template.titleHi,
      subtitle: template.subtitle,
      subtitleHi: template.subtitleHi,
      description: template.description,
      descriptionHi: template.descriptionHi,
      price: template.price,
      isPublished: template.status === "PUBLISHED",
      status: CourseStatus.PUBLISHED,
      isPremium: true,
      difficulty: Difficulty.INTERMEDIATE,
      technology: template.technology,
      metadataJson,
    },
    create: {
      title: template.title,
      titleHi: template.titleHi,
      slug: template.slug,
      subtitle: template.subtitle,
      subtitleHi: template.subtitleHi,
      description: template.description,
      descriptionHi: template.descriptionHi,
      price: template.price,
      isPublished: template.status === "PUBLISHED",
      status: CourseStatus.PUBLISHED,
      isPremium: true,
      difficulty: Difficulty.INTERMEDIATE,
      technology: template.technology,
      metadataJson,
    },
  });

  // Clean existing units/chapters/syllabus for idempotency
  await prisma.courseSyllabusPaper.deleteMany({ where: { courseId: course.id } });
  await prisma.chapter.deleteMany({ where: { courseId: course.id } });
  await prisma.courseUnit.deleteMany({ where: { courseId: course.id } });

  const unitMap: Record<number, string> = {};

  // Seed Units
  for (const u of template.units || []) {
    const unit = await prisma.courseUnit.create({
      data: {
        courseId: course.id,
        title: u.title,
        titleHi: u.titleHi,
        order: u.number * 10,
        tags: u.tag ? [u.tag] : [],
      },
    });
    unitMap[u.number] = unit.id;

    // Seed Themes as Chapters under this unit
    for (let tIdx = 0; tIdx < (u.themes || []).length; tIdx++) {
      const theme = u.themes[tIdx];
      const chapter = await prisma.chapter.create({
        data: {
          courseId: course.id,
          unitId: unit.id,
          title: theme.title,
          titleHi: theme.titleHi,
          order: (tIdx + 1) * 10,
          subtopics: (theme.subtopics || []).map((st: any) => st.title),
          subtopicsHi: (theme.subtopics || []).map((st: any) => st.titleHi || st.title),
        },
      });

      // Seed Lectures
      for (let lIdx = 0; lIdx < (theme.lectures || []).length; lIdx++) {
        const lec = theme.lectures[lIdx];
        await prisma.lesson.create({
          data: {
            chapterId: chapter.id,
            title: lec.title,
            titleHi: lec.titleHi,
            type: LessonType.VIDEO,
            order: (lIdx + 1) * 10,
            durationText: lec.durationMin ? `${lec.durationMin} mins` : "90 mins",
          },
        });
      }
    }
  }

  // Seed Syllabus if present
  if (template.syllabus?.papers) {
    for (let pIdx = 0; pIdx < template.syllabus.papers.length; pIdx++) {
      const p = template.syllabus.papers[pIdx];
      const paper = await prisma.courseSyllabusPaper.create({
        data: {
          courseId: course.id,
          key: p.id,
          title: p.title,
          titleHi: p.titleHi,
          marks: p.marks,
          durationMinutes: p.hours ? p.hours * 60 : 180,
          introText: p.introQuote,
          introTextHi: p.introQuoteHi,
          order: (pIdx + 1) * 10,
        },
      });

      for (let sIdx = 0; sIdx < (p.sections || []).length; sIdx++) {
        const sec = p.sections[sIdx];
        const linkedUnitId = sec.linkedUnitNumber ? unitMap[sec.linkedUnitNumber] : undefined;
        await prisma.courseSyllabusSection.create({
          data: {
            paperId: paper.id,
            title: sec.name,
            titleHi: sec.nameHi,
            unitId: linkedUnitId,
            order: (sIdx + 1) * 10,
          },
        });
      }
    }
  }

  console.log(`Course ${course.slug} seeded successfully with ID ${course.id}`);
  return course;
}

async function main() {
  console.log("=== SEEDING COURSE DETAIL V2 (BPSC + SSC CGL) ===");
  await seedCourseFromTemplate(BPSC_MAINS_DEMOLISH_TEMPLATE);
  await seedCourseFromTemplate(SSC_CGL_TIER_2_TEMPLATE);
  console.log("=== SEEDING COMPLETED ===");
}

main()
  .catch((e) => {
    console.error("Failed to seed course detail v2:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
