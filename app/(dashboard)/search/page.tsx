import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Dumbbell, PlayCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cleanDescriptionSnippet } from "@/lib/utils"

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const resolvedParams = await searchParams
    const query = resolvedParams?.q || ""

    if (!query) {
        return (
            <div className="p-8 text-center pb-32 sm:pb-24 lg:pb-12">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search</h1>
                <p className="text-slate-600 dark:text-slate-300 mt-2">Enter a term to search for courses and lessons.</p>
            </div>
        )
    }

    let courses: any[] = []
    let lessons: any[] = []

    try {
        ;[courses, lessons] = await Promise.all([
            prisma.course.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: "insensitive" } },
                        { description: { contains: query, mode: "insensitive" } },
                    ],
                    status: "PUBLISHED",
                },
                take: 10,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    description: true,
                    thumbnailUrl: true,
                },
            }),
            prisma.lesson.findMany({
                where: {
                    title: { contains: query, mode: "insensitive" },
                },
                select: {
                    id: true,
                    title: true,
                    type: true,
                    chapter: {
                        select: {
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                    slug: true,
                                },
                            },
                        },
                    },
                },
                take: 10,
            }),
        ])
    } catch {
        console.warn("Database offline on /search, returning empty results.")
    }

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 pb-32 sm:pb-24 lg:pb-12">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Search Results for "{query}"</h1>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Found {courses.length} courses and {lessons.length} lessons
                </p>
            </div>

            {/* Courses */}
            {courses.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <BookOpen className="h-5 w-5" />
                        Courses
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <Link key={course.id} href={`/courses/${course.slug}`}>
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <div className="aspect-video relative bg-gray-100 dark:bg-slate-800">
                                        {course.thumbnailUrl ? (
                                            <Image
                                                src={course.thumbnailUrl}
                                                alt={course.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <BookOpen className="h-10 w-10 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{course.title}</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                            {cleanDescriptionSnippet(course.description, 130)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Lessons */}
            {lessons.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <PlayCircle className="h-5 w-5" />
                        Lessons
                    </h2>
                    <div className="space-y-3">
                        {lessons.map((lesson) => (
                            <Link
                                key={lesson.id}
                                href={`/learn/${lesson.chapter.course.slug}/${lesson.id}`}
                            >
                                <Card className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950/60 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            {lesson.type === "VIDEO" ? (
                                                <PlayCircle className="h-5 w-5" />
                                            ) : (
                                                <Dumbbell className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">{lesson.title}</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                in {lesson.chapter.course.title}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {courses.length === 0 && lessons.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-slate-600 dark:text-slate-300">No results found. Try a different search term.</p>
                </div>
            )}
        </div>
    )
}
