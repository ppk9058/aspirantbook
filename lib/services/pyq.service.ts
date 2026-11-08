import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import { resolveAccess } from "@/lib/authwall/resolveAccess";
import { PyqExamDto, PyqPaperDto } from "@aspirantbook/shared";
import { checkPaperAccess, canAccessPaidPaper, hasActivePass, isPaperPaid } from "@/lib/pyqs/pyq-access";

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
      isGated: paper.isGated || isPaperPaid(paper.accessType),
      previewPercentage: paper.previewPercentage,
      gateTitle: paper.gateTitle,
      gateSubtitle: paper.gateSubtitle,
    },
  });

  const paperAccess = await checkPaperAccess({
    userId: viewer.userId,
    role: viewer.role,
    paper: {
      id: paper.id,
      accessType: paper.accessType,
      creatorId: paper.creatorId,
    },
  });

  const canAccessFile = !access.isLockedForGuest && paperAccess.allowed;

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
    fileUrl: canAccessFile ? paper.paperPdfUrl : null,
  };
}

export async function getPyqPapers(
  viewer: Viewer,
  query?: { examId?: string; year?: number; search?: string; limit?: number }
): Promise<PyqPaperDto[]> {
  const where: any = { status: "PUBLISHED" };
  if (query?.examId) {
    where.categoryId = query.examId;
  }
  if (query?.year) {
    where.year = query.year;
  }
  if (query?.search) {
    where.title = { contains: query.search, mode: "insensitive" };
  }

  const papers = await prisma.pyqPaper.findMany({
    where,
    include: {
      category: { select: { name: true } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: query?.limit ? Math.min(query.limit, 50) : 50,
  });

  const passActive = viewer.userId ? await hasActivePass(viewer.userId) : false;
  const userUnlocks =
    viewer.userId && papers.some((p) => isPaperPaid(p.accessType))
      ? new Set(
          (
            await prisma.pyqUnlock.findMany({
              where: {
                userId: viewer.userId,
                paperId: { in: papers.map((p) => p.id) },
              },
              select: { paperId: true },
            })
          ).map((u) => u.paperId)
        )
      : new Set<string>();

  return papers.map((paper) => {
    const access = resolveAccess({
      viewer: {
        userId: viewer.userId,
        role: viewer.role,
      },
      content: Array.from({ length: paper.totalQuestions || 100 }, (_, i) => ({
        questionIndex: i + 1,
      })),
      containerGate: {
        isGated: paper.isGated || isPaperPaid(paper.accessType),
        previewPercentage: paper.previewPercentage,
        gateTitle: paper.gateTitle,
        gateSubtitle: paper.gateSubtitle,
      },
    });

    const paperAccess = canAccessPaidPaper({
      userId: viewer.userId,
      role: viewer.role,
      paper: {
        accessType: paper.accessType,
        creatorId: paper.creatorId,
      },
      hasPass: passActive,
      hasUnlock: userUnlocks.has(paper.id),
    });

    const canAccessFile = !access.isLockedForGuest && paperAccess.allowed;

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
      fileUrl: canAccessFile ? paper.paperPdfUrl : null,
    };
  });
}
