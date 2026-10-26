import { prisma } from "@/lib/prisma";
import { SearchResultsDto, SearchResultItemDto } from "@aspirantbook/shared";

export async function performGlobalSearch(q: string): Promise<SearchResultsDto> {
  const cleanQ = (q || "").trim();
  if (!cleanQ || cleanQ.length < 2) {
    return { query: cleanQ, total: 0, results: [] };
  }

  const [courses, tests, series, pyqs] = await Promise.all([
    prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: cleanQ, mode: "insensitive" } },
          { description: { contains: cleanQ, mode: "insensitive" } },
        ],
      },
      take: 6,
      select: { id: true, title: true, difficulty: true, isPremium: true },
    }),
    prisma.examTest.findMany({
      where: {
        series: { isPublished: true },
        OR: [
          { title: { contains: cleanQ, mode: "insensitive" } },
          { syllabus: { contains: cleanQ, mode: "insensitive" } },
        ],
      },
      take: 6,
      select: { id: true, title: true, durationMinutes: true, totalMarks: true },
    }),
    prisma.examSeries.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: cleanQ, mode: "insensitive" } },
          { description: { contains: cleanQ, mode: "insensitive" } },
          { examName: { contains: cleanQ, mode: "insensitive" } },
        ],
      },
      take: 4,
      select: { id: true, title: true, examName: true },
    }),
    prisma.pyqPaper.findMany({
      where: {
        title: { contains: cleanQ, mode: "insensitive" },
      },
      take: 4,
      select: { id: true, title: true, year: true, category: { select: { name: true } } },
    }),
  ]);

  const results: SearchResultItemDto[] = [];

  for (const c of courses) {
    results.push({
      id: c.id,
      type: "COURSE",
      title: c.title,
      subtitle: c.difficulty ? `${c.difficulty} Level` : "Video Course",
      route: `/courses/${c.id}`,
      badge: c.isPremium ? "PRO" : "FREE",
    });
  }

  for (const t of tests) {
    results.push({
      id: t.id,
      type: "TEST",
      title: t.title,
      subtitle: `${t.durationMinutes} mins • ${t.totalMarks} marks`,
      route: `/tests/${t.id}`,
      badge: "MOCK TEST",
    });
  }

  for (const s of series) {
    results.push({
      id: s.id,
      type: "SERIES",
      title: s.title,
      subtitle: s.examName || "Test Series Package",
      route: `/tests/series/${s.id}`,
      badge: "SERIES",
    });
  }

  for (const p of pyqs) {
    results.push({
      id: p.id,
      type: "PYQ",
      title: p.title,
      subtitle: `${p.category?.name || "Exam"} • Year ${p.year}`,
      route: `/pyqs/pdf-view?id=${p.id}`,
      badge: "PYQ",
    });
  }

  return {
    query: cleanQ,
    total: results.length,
    results,
  };
}
