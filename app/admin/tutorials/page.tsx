import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { Edit, Eye, AlertCircle, BookOpen, Plus, FileText, Sparkles, ExternalLink } from "lucide-react"
import { cleanDescriptionSnippet, formatDate } from "@/lib/utils"
import { TutorialStudioImportButton } from "@/components/editor/TutorialStudioImportButton"

export const dynamic = "force-dynamic"

export default async function AdminTutorialsPage() {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }
    const basePath = user.role === "TEACHER" ? "/teacher" : "/admin"

    let tutorials: any[] = []
    let dbError: string | null = null

    try {
        // Fetch all courses, prioritizing text-based tutorials (e.g. Intro to Python, Generative AI, C Foundations, etc.)
        tutorials = await prisma.course.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                chapters: {
                    include: {
                        lessons: {
                            select: { id: true, title: true, type: true, videoUrl: true },
                        },
                    },
                },
                _count: {
                    select: { enrollments: true },
                },
            },
        })
    } catch (err: any) {
        console.error("Database connection error in /admin/tutorials:", err.message)
        dbError = err.message || "Can't reach database server"
    }

    // Strictly include ONLY text-based tutorials (exclude video courses with video lessons, video titles/slugs, or flagship video courses)
    const textTutorials = tutorials.filter((c) => {
        if (c.slug === "72nd-bpsc-prelims-current-affairs") return false
        const lowerTitle = (c.title || "").toLowerCase()
        const lowerSlug = (c.slug || "").toLowerCase()
        if (lowerTitle.includes("video course") || lowerTitle.includes("video tutorial") || lowerSlug.includes("video")) {
            return false
        }
        const allLessons = c.chapters?.flatMap((ch: any) => ch.lessons || []) || []
        const hasVideoLessons = allLessons.some((l: any) => Boolean(l.videoUrl) || l.type === "VIDEO")
        if (hasVideoLessons) return false
        return true
    })

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-[#3A10E5] text-white flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Tutorial Studio
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            🌹 Rosera Editor (Fluid LLM Native)
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#10162F] tracking-tight">
                        Text &amp; Interactive Tutorials
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm font-medium">
                        Unified authoring in <strong>Rosera Editor</strong>: write structured lessons, format fluid interactive blocks, and paste raw LLM JSON packages seamlessly ({textTutorials.length} total tutorials).
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <TutorialStudioImportButton />
                    <Link href={`${basePath}/tutorials/new`}>
                        <Button className="bg-[#3A10E5] hover:bg-[#300ec2] text-white font-black border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] flex items-center gap-2 text-xs py-2 px-3.5 active:translate-x-[1px] active:translate-y-[1px]">
                            <Sparkles className="h-4 w-4 text-[#FFD15C]" />
                            🌹 Create Tutorial (Rosera Editor)
                        </Button>
                    </Link>
                </div>
            </div>

            {dbError && (
                <div className="p-4 rounded-xl border-2 border-rose-300 bg-rose-50 text-rose-800 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-sm">Database Connectivity Warning</h4>
                        <p className="text-xs text-rose-700 mt-1">{dbError}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {textTutorials.map((tutorial) => {
                    const totalLessons = tutorial.chapters?.reduce(
                        (sum: number, ch: any) => sum + ch.lessons.length,
                        0
                    ) || 0

                    return (
                        <Card key={tutorial.id} className="border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] overflow-hidden bg-white">
                            <CardContent className="p-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                            <h3 className="text-lg font-extrabold text-[#10162F] truncate">
                                                {tutorial.title}
                                            </h3>
                                            <Badge variant={tutorial.status === "PUBLISHED" ? "default" : "secondary"}>
                                                {tutorial.status}
                                            </Badge>
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                🌹 Rosera Editor
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words">
                                            {cleanDescriptionSnippet(tutorial.description, 180)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-500">
                                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{tutorial.difficulty}</span>
                                            <span>•</span>
                                            <span className="font-bold text-[#10162F]">{tutorial.technology || "General"}</span>
                                            <span>•</span>
                                            <span>{tutorial.chapters?.length || 0} Chapters</span>
                                            <span>•</span>
                                            <span>{totalLessons} Text Lessons</span>
                                            <span>•</span>
                                            <span suppressHydrationWarning>Updated {formatDate(tutorial.updatedAt)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center flex-wrap">
                                        <Link href={`/courses/${tutorial.slug || tutorial.id}`} target="_blank">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-2 border-[#10162F] font-bold shadow-[2px_2px_0px_#10162F] hover:bg-gray-100 text-xs text-[#10162F] flex items-center gap-1.5"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                View Live
                                            </Button>
                                        </Link>
                                        <Link href={`${basePath}/tutorials/${tutorial.id}/edit`}>
                                            <Button
                                                size="sm"
                                                className="border-2 border-[#10162F] font-black shadow-[2px_2px_0px_#10162F] bg-[#3A10E5] hover:bg-[#300ec2] text-xs text-white flex items-center gap-1.5"
                                            >
                                                <Sparkles className="h-3.5 w-3.5 text-[#FFD15C]" />
                                                🌹 Edit in Rosera Editor
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {textTutorials.length === 0 && !dbError && (
                    <Card className="border-2 border-dashed border-gray-300">
                        <CardContent className="p-12 text-center">
                            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="font-bold text-gray-900 mb-1">No Tutorials Found</h3>
                            <p className="text-gray-500 mb-4 text-xs">Create your first interactive tutorial using the Rosera Editor.</p>
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                <Link href={`${basePath}/tutorials/new`}>
                                    <Button className="bg-[#3A10E5] hover:bg-[#300ec2] text-white font-black border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] flex items-center gap-2 text-xs py-2 px-3.5">
                                        <Sparkles className="h-4 w-4 text-[#FFD15C]" />
                                        🌹 Create Tutorial with Rosera Editor
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
