/**
 * Phase 3 seed: premium course + chapter + lesson with sentinel paid content.
 * Run against 127.0.0.1:54329/launch_verify only.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SENTINEL_VIDEO = "https://cdn.example.test/SENTINEL_PAID_VIDEO.mp4";
const SENTINEL_CONTENT = "SENTINEL_PAID_CONTENT_BODY";
const SENTINEL_ATTACH = "https://cdn.example.test/SENTINEL_PAID_ATTACH.pdf";

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: "fv-pub-a" } });
  if (!course) throw new Error("fv-pub-a missing");

  const chapter = await prisma.chapter.upsert({
    where: { courseId_externalId: { courseId: course.id, externalId: "fv-ch-1" } },
    update: {},
    create: { courseId: course.id, externalId: "fv-ch-1", title: "FV Chapter 1", order: 1 },
    select: { id: true },
  });

  const paid = await prisma.lesson.upsert({
    where: { chapterId_externalId: { chapterId: chapter.id, externalId: "fv-lesson-paid" } },
    update: {},
    create: {
      chapterId: chapter.id,
      externalId: "fv-lesson-paid",
      title: "FV Paid Lesson",
      type: "VIDEO",
      order: 1,
      isTrial: false,
      videoUrl: SENTINEL_VIDEO,
      content: SENTINEL_CONTENT,
      attachmentType: "PDF",
      attachmentUrl: SENTINEL_ATTACH,
      attachmentName: "SENTINEL_PAID_ATTACH.pdf",
    },
    select: { id: true, title: true },
  });

  const trial = await prisma.lesson.upsert({
    where: { chapterId_externalId: { chapterId: chapter.id, externalId: "fv-lesson-trial" } },
    update: {},
    create: {
      chapterId: chapter.id,
      externalId: "fv-lesson-trial",
      title: "FV Trial Lesson",
      type: "VIDEO",
      order: 2,
      isTrial: true,
      videoUrl: SENTINEL_VIDEO,
      content: SENTINEL_CONTENT,
    },
    select: { id: true, title: true },
  });

  console.log(JSON.stringify({ course: course.id, chapter: chapter.id, paid, trial, SENTINEL_VIDEO, SENTINEL_CONTENT, SENTINEL_ATTACH }, null, 2));
}

main().finally(() => prisma.$disconnect());
