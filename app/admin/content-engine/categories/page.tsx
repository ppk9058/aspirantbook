import { prisma } from "@/lib/prisma"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { T, SUBHI, TOPHI } from "@/lib/modules/content-engine/taxonomy"
import { Badge } from "@/components/ui/badge"
import { Tag, ShieldCheck, Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ContentEngineCategoriesPage() {
  // Aggregate question counts by sub and top
  const counts = await prisma.contentEngineQuestion.groupBy({
    by: ["sub", "top"],
    _count: { id: true },
  })

  const countMap: Record<string, number> = {}
  counts.forEach((c) => {
    countMap[`${c.sub}::${c.top}`] = c._count.id
  })

  // Fetch manual overrides
  const overrides = await prisma.contentEngineCategoryOverride.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      question: {
        select: { shortId: true, q: true },
      },
    },
  })

  // Group taxonomy by subject
  const subjectsMap: Record<string, string[]> = {}
  T.forEach(([sub, top]) => {
    if (!subjectsMap[sub]) subjectsMap[sub] = []
    subjectsMap[sub].push(top)
  })

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-8">
      <ContentEngineHeader
        title="Taxonomy & Category Overrides"
        description="Inspect the standard 25-subject taxonomy, keyword mapping, Hindi translations, and active manual overrides."
      />

      {/* Manual Overrides Protection Card */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>Manual Category Overrides ({overrides.length})</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Questions with manual overrides are permanently locked against automated re-categorisation passes.
        </p>

        {overrides.length > 0 && (
          <div className="pt-2 space-y-2 max-h-48 overflow-y-auto">
            {overrides.map((ov) => (
              <div
                key={ov.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/80 border border-border/60 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-muted-foreground">ID: {ov.question?.shortId}</span>
                  <span className="font-medium truncate">{ov.question?.q}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {ov.sub}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {ov.top}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standard Taxonomy Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span>Standard Subjects & Topics</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(subjectsMap).map(([subject, topics]) => {
            const subjectHindi = SUBHI[subject] || ""
            return (
              <div
                key={subject}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="border-b border-border/60 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{subject}</h3>
                    {subjectHindi && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {subjectHindi}
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {topics.length} Topics
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {topics.map((top) => {
                    const topHindi = TOPHI[top] || ""
                    const count = countMap[`${subject}::${top}`] || 0
                    return (
                      <div
                        key={top}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-muted/40 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium text-foreground">{top}</span>
                          {topHindi && (
                            <span className="text-muted-foreground ml-1.5 text-[11px]">
                              ({topHindi})
                            </span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            count > 0 ? "border-primary/40 text-primary" : "text-muted-foreground opacity-60"
                          }`}
                        >
                          {count}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
