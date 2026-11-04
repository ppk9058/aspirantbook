/**
 * Phase 3 seed: teacher-A-owned content for isolation + draft visibility tests.
 * Run against 127.0.0.1:54329/launch_verify only.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const a = await prisma.user.findUnique({ where: { email: "fv.teacher.a@example.test" } });
  const b = await prisma.user.findUnique({ where: { email: "fv.teacher.b@example.test" } });
  if (!a || !b) throw new Error("seeded teachers missing");

  const upsertCourse = async (slug: string, title: string, status: "DRAFT" | "PUBLISHED", isPublished: boolean, isPremium: boolean) =>
    prisma.course.upsert({
      where: { slug },
      update: { createdById: a.id, status, isPublished, isPremium },
      create: {
        title,
        slug,
        description: `${title} (phase3 fixture)`,
        difficulty: "BEGINNER",
        status,
        isPublished,
        isPremium,
        createdById: a.id,
        prerequisites: [],
      },
      select: { id: true, slug: true, status: true, isPublished: true, createdById: true },
    });

  const draft = await upsertCourse("fv-draft-a", "FV Draft A", "DRAFT", false, false);
  const pub = await upsertCourse("fv-pub-a", "FV Published A", "PUBLISHED", true, true);

  const series = await prisma.examSeries.upsert({
    where: { slug: "fv-series-a" },
    update: { createdById: a.id },
    create: {
      title: "FV Series A",
      slug: "fv-series-a",
      examName: "FV Exam",
      category: "FV",
      description: "phase3 fixture",
      createdById: a.id,
      isPublished: false,
    },
    select: { id: true, slug: true, createdById: true, isPublished: true },
  });

  console.log(JSON.stringify({ teacherA: a.id, teacherB: b.id, draft, pub, series }, null, 2));
}

main().finally(() => prisma.$disconnect());
