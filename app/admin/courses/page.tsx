import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { Edit, Eye, AlertCircle, Video, BookOpen, ArrowRight, Plus } from "lucide-react"
import { cleanDescriptionSnippet, formatDate } from "@/lib/utils"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

export default async function CoursesPage() {
    const session = await auth()
    const basePath = session?.user?.role === "TEACHER" ? "/teacher" : "/admin"
    let courses: any[] = []
    let dbError: string | null = null

    try {
        courses = await prisma.course.findMany({
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
        console.error("Database connection error in /admin/courses:", err.message)
        dbError = err.message || "Can't reach database server"
    }

    // Video Courses: courses with price, video lessons, or 72nd BPSC
    const videoCourses = courses.filter((c) => {
        if (c.slug === "72nd-bpsc-prelims-current-affairs") return true
        if (c.price && c.price > 0) return true
        return c.chapters?.some((ch: any) => ch.lessons.some((l: any) => l.videoUrl || l.type === "VIDEO"))
    })

    // If none matched, show all so teacher isn't left empty
    const displayCourses = videoCourses.length > 0 ? videoCourses : courses

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-orange-600 text-white flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Video Course Studio
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                            Video CRUD &bull; Multi-Chapter &bull; PDF Notes
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#10162F]">Video Course Studio</h1>
                    <p className="text-gray-600 mt-1 font-medium">
                        Author and manage full-length video courses, video uploads, PDF downloads, and custom pricing ({displayCourses.length} video courses)
                    </p>
                </div>
                <Link href={`${basePath}/courses/new`}>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        + Create Video Course
                    </Button>
                </Link>
            </div>

            {/* Studio Switcher Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border-2 border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
                <div className="flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-[#3A10E5] shrink-0" />
                    <div>
                        <span className="font-bold">Feature your Video Courses on the Public Homepage?</span>
                        <p className="text-indigo-700 text-[11px] mt-0.5">
                            Use the dedicated <strong>HomePage Card Studio</strong> to match slugs, customize prices, and curate homepage cards without database latency.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                    <Link
                        href="/admin/homepage-cards"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shrink-0"
                    >
                        <span>HomePage Card Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                        href={`${basePath}/tutorials`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-300 font-bold text-[#3A10E5] hover:bg-indigo-100 transition-colors shrink-0"
                    >
                        <span>Tutorial Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
                {displayCourses.map((course) => {
                    const totalLessons = course.chapters?.reduce(
                        (sum: number, ch: any) => sum + ch.lessons.length,
                        0
                    ) || 0

                    return (
                        <Card key={course.id} className="border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] overflow-hidden bg-white">
                            <CardContent className="p-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                            <h3 className="text-lg font-extrabold text-[#10162F] truncate">
                                                {course.title}
                                            </h3>
                                            <Badge variant={course.status === "PUBLISHED" ? "default" : "secondary"}>
                                                {course.status}
                                            </Badge>
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                                                Video Course
                                            </span>
                                            {course.price && course.price > 0 && (
                                                <Badge className="bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                                    ₹{course.price.toLocaleString()}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words">
                                            {cleanDescriptionSnippet(course.description, 180)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-500">
                                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{course.difficulty}</span>
                                            <span>•</span>
                                            <span className="font-bold text-[#10162F]">{course.technology || "General"}</span>
                                            <span>•</span>
                                            <span>{course.chapters?.length || 0} Sections</span>
                                            <span>•</span>
                                            <span>{totalLessons} Lectures</span>
                                            <span>•</span>
                                            <span suppressHydrationWarning>Updated {formatDate(course.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                        <Link href={`${basePath}/courses/${course.id}/edit`}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-2 border-[#10162F] font-bold shadow-[2px_2px_0px_#10162F] hover:bg-[#FFF5EB] text-xs text-orange-600 flex items-center gap-1.5"
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                                Edit in Video Studio
                                            </Button>
                                        </Link>
                                        <Link href={`/courses/${course.slug || course.id}`} target="_blank">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-2 border-[#10162F] font-bold shadow-[2px_2px_0px_#10162F] hover:bg-[#FFF5EB] text-xs text-[#10162F] flex items-center gap-1.5"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Student View
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
