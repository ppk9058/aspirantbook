"use client"

import Link from "next/link"
import Image from "next/image"
import { Star, Users, PlayCircle, Clock, BookOpen, Sparkles, ArrowRight, Video } from "lucide-react"
import { cleanDescriptionSnippet } from "@/lib/utils"
import { useGoal } from "@/components/providers/GoalProvider"

interface Course {
    id: string
    title: string
    slug: string
    description: string
    thumbnailUrl: string | null
    difficulty: string
    rating: number
    enrollmentCount: number
    duration?: string
    lessonsCount?: number
}

interface RecommendedCoursesProps {
    courses: Course[]
}

export default function RecommendedCourses({ courses }: RecommendedCoursesProps) {
    const { selectedGoal } = useGoal()

    const goalName = selectedGoal?.name || "Curated"
    const goalFullName = selectedGoal?.fullName || selectedGoal?.name || "All Goals"

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#1448d8] uppercase tracking-wider mb-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Recommended Curricula &bull; {goalName}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Featured Courses for {goalFullName}
                    </h2>
                </div>
                <Link
                    href="/courses"
                    className="text-xs font-extrabold text-[#1448d8] hover:text-[#0f37a8] flex items-center gap-1 transition-colors self-start sm:self-auto"
                >
                    <span>View All Catalog</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {/* Courses 3-Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course) => (
                    <Link
                        key={course.id}
                        href={`/courses/${course.slug}`}
                        className="group flex flex-col justify-between bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#1448d8]/60 dark:hover:border-[#1448d8]/60 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                        {/* Course Image Banner */}
                        <div className="relative h-44 w-full bg-gradient-to-br from-teal-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
                            {course.thumbnailUrl ? (
                                <Image
                                    src={course.thumbnailUrl}
                                    alt={course.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-600 to-slate-800 text-white p-4 text-center">
                                    <BookOpen className="h-10 w-10 mb-2 opacity-90" />
                                    <span className="text-xs font-black uppercase tracking-wider">{course.title}</span>
                                </div>
                            )}

                            {/* Subtle dark gradient at top and bottom for text legibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-900/80 dark:bg-white/20 backdrop-blur-md text-white shadow-xs uppercase tracking-wider flex items-center gap-1">
                                    <Video className="w-3 h-3 text-[#1448d8]" />
                                    Course
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/95 dark:bg-black/80 backdrop-blur-md text-emerald-700 dark:text-emerald-400 shadow-xs">
                                    {course.difficulty}
                                </span>
                            </div>

                            {/* Bottom Left Rating */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-slate-900 dark:text-white text-xs font-black shadow-xs">
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                {/* B12: a course with no rating is "New", not a fabricated 4.8. */}
                                <span>{course.rating > 0 ? course.rating.toFixed(1) : "New"}</span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-extrabold text-base text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#1448d8] transition-colors">
                                    {course.title}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                    {cleanDescriptionSnippet(course.description, 130)}
                                </p>
                            </div>

                            <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-gray-800/80">
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Clock className="h-3.5 w-3.5 text-[#1448d8]" />
                                        {course.duration ||
                                            (course.lessonsCount
                                                ? `${course.lessonsCount} lessons`
                                                : "Self-paced")}
                                    </span>
                                    <span className="flex items-center gap-1 font-medium">
                                        <Users className="h-3.5 w-3.5 text-gray-400" />
                                        {course.enrollmentCount > 0
                                            ? `${course.enrollmentCount.toLocaleString("en-IN")} learners`
                                            : "New course"}
                                    </span>
                                </div>

                                <div className="w-full py-2.5 px-4 rounded-xl bg-blue-50/70 hover:bg-[#1448d8] dark:bg-blue-950/40 dark:hover:bg-[#1448d8] text-[#1448d8] hover:text-white dark:text-blue-300 dark:hover:text-white border border-blue-200/80 dark:border-blue-800/60 font-black text-xs flex items-center justify-center gap-2 transition-all group-hover:bg-[#1448d8] group-hover:text-white group-hover:border-transparent shadow-2xs">
                                    <PlayCircle className="h-4 w-4" />
                                    <span>Explore Course</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
