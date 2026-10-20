import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { Metadata } from "next"
import CurrentAffairsQuizzesClient from "@/components/quizzes/CurrentAffairsQuizzesClient"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Current Affairs and Quizzes | aspirantbook",
  description: "Daily speed tests, monthly current affairs roundups, and general awareness quizzes for competitive examinations.",
}

export default async function CurrentAffairsQuizzesPage() {
  const session = await auth()

  // Fetch published monthly CA PDFs directly from database
  let initialPdfs: any[] = []
  const fetchCaPdfs = async () => {
    return prisma.currentAffairsPdf.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        titleHi: true,
        month: true,
        year: true,
        pdfUrlEn: true,
        pdfUrlHi: true,
        fileSizeKbEn: true,
        fileSizeKbHi: true,
        status: true,
        downloadCount: true,
        createdAt: true,
      },
    })
  }

  const getCachedCaPdfs = unstable_cache(
    fetchCaPdfs,
    ["current-affairs-pdfs-v1"],
    { revalidate: 60, tags: ["current-affairs"] }
  )

  const getCaPdfs = process.env.APP_ENV === "test" ? fetchCaPdfs : getCachedCaPdfs

  try {
    initialPdfs = await getCaPdfs()
  } catch (err) {
    console.error("Error loading initial Current Affairs PDFs:", err)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CurrentAffairsQuizzesClient
        initialPdfs={JSON.parse(JSON.stringify(initialPdfs))}
        userRole={session?.user?.role}
        userId={session?.user?.id}
      />
    </div>
  )
}
