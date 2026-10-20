import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import { resolveAccess } from "@/lib/authwall/resolveAccess";
import { PyqExamDto, PyqPaperDto } from "@aspirantbook/shared";

export async function getPyqExams(): Promise<PyqExamDto[]> {
  const categories = await prisma.pyqCategory.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: {
          papers: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.slug,
    description: c.description,
    totalPapers: c._count.papers,
  }));
}

export async function getPyqPaper(
  viewer: Viewer,
  paperId: string
): Promise<PyqPaperDto & { fileUrl?: string | null }> {
  const paper = await prisma.pyqPaper.findFirst({
    where: {
      OR: [{ id: paperId }, { slug: paperId }],
      status: "PUBLISHED",
    },
    include: {
      category: { select: { name: true } },
    },
  });

  if (!paper) {
    throw new Error("NOT_FOUND: PYQ paper not found");
  }

  // Authwall gating rule
  const access = resolveAccess({
    viewer: {
      userId: viewer.userId,
      role: viewer.role,
    },
    content: Array.from({ length: paper.totalQuestions || 100 }, (_, i) => ({
      questionIndex: i + 1,
    })),
    containerGate: {
      isGated: paper.isGated || paper.accessType !== "FREE",
      previewPercentage: paper.previewPercentage,
      gateTitle: paper.gateTitle,
      gateSubtitle: paper.gateSubtitle,
    },
  });

  return {
    id: paper.id,
    title: paper.title,
    year: paper.year,
    shift: paper.shift,
    examId: paper.categoryId,
    examName: paper.category.name,
    hasFile: Boolean(paper.paperPdfUrl),
    totalQuestions: paper.totalQuestions,
    isLockedForGuest: access.isLockedForGuest,
    previewCount: access.previewCount,
    totalItemsCount: access.totalItemsCount,
    fileUrl: access.isLockedForGuest ? null : paper.paperPdfUrl,
  };
}
