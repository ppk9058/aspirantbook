import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import { resolveAccess } from "@/lib/authwall/resolveAccess";
import { CurrentAffairsItemDto } from "@aspirantbook/shared";

export async function getCurrentAffairsList(viewer: Viewer): Promise<CurrentAffairsItemDto[]> {
  const items = await prisma.currentAffairsPdf.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 30,
    select: {
      id: true,
      title: true,
      month: true,
      year: true,
      pdfUrlEn: true,
      createdAt: true,
    },
  });

  return items.map((i) => ({
    id: i.id,
    title: i.title,
    slug: i.id,
    month: i.month,
    year: i.year,
    category: "General Awareness & Monthly Digest",
    hasPdf: Boolean(i.pdfUrlEn),
    quizCount: 10,
    publishedAt: i.createdAt.toISOString(),
  }));
}

export async function getCurrentAffairsDetail(
  viewer: Viewer,
  id: string
): Promise<CurrentAffairsItemDto & { fileUrl?: string | null; isLockedForGuest: boolean }> {
  const item = await prisma.currentAffairsPdf.findUnique({
    where: { id },
  });

  if (!item || item.status !== "PUBLISHED") {
    throw new Error("NOT_FOUND: Current affairs digest not found");
  }

  const access = resolveAccess({
    viewer: {
      userId: viewer.userId,
      role: viewer.role,
    },
    content: ["Introduction", "Overview", "National News", "International News", "Sports & Awards"],
    containerGate: {
      isGated: item.isGated,
      previewPercentage: item.previewPercentage,
      gateTitle: item.gateTitle,
      gateSubtitle: item.gateSubtitle,
    },
  });

  return {
    id: item.id,
    title: item.title,
    slug: item.id,
    month: item.month,
    year: item.year,
    category: "General Awareness & Monthly Digest",
    hasPdf: Boolean(item.pdfUrlEn),
    quizCount: 10,
    publishedAt: item.createdAt.toISOString(),
    isLockedForGuest: access.isLockedForGuest,
    fileUrl: access.isLockedForGuest ? null : item.pdfUrlEn,
  };
}
