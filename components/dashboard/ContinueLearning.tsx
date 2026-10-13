"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronRight, PlayCircle, BookOpen } from "lucide-react"

interface Course {
    course: {
        id: string
        title: string
        slug: string
        thumbnailUrl: string | null
        difficulty: string
    }
    progress: number
    lastAccessed?: Date
}

interface ContinueLearningProps {
    courses: Course[]
}

export default function ContinueLearning({ courses }: ContinueLearningProps) {
    if (!courses || courses.length === 0) return null

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Jump Back In</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Continue right where you left off</p>
                </div>
                <Link
                    href="/my-learning"
                    className="text-xs text-[#1448d8] hover:text-[#0f37a8] font-semibold flex items-center gap-1 transition-colors"
                >
                    <span>View all</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map(({ course, progress }) => (
                    <Link
                        key={course.id}
                        href={`/courses/${course.slug}`}
                        className="group flex flex-col justify-between bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#1448d8]/50 dark:hover:border-[#1448d8]/50 shadow-sm hover:shadow-md transition-all p-4 relative overflow-hidden"
                    >
                        <div className="flex items-start gap-3.5">
                            {/* Thumbnail */}
                            <div className="relative w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-800">
                                {course.thumbnailUrl ? (
                                    <Image
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1448d8]/20 to-[#1DB954]/20 text-[#1448d8]">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                )}
                            </div>

                            {/* Title & Metadata */}
                            <div className="flex-1 min-w-0">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mb-1">
                                    {course.difficulty}
                                </span>
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#1448d8] transition-colors">
                                    {course.title}
                                </h3>
                                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                                    <span>{progress}% completed</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar & Resume Button */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-[#1448d8] to-[#1DB954] h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1448d8] group-hover:translate-x-0.5 transition-transform">
                                <PlayCircle className="h-4 w-4" />
                                <span>Resume</span>
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
