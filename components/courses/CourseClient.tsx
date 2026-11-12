"use client"

import { useState, useMemo, useEffect } from "react"
import SearchBar from "@/components/courses/SearchBar"
import CourseTabs from "@/components/courses/CourseTabs"
import CourseCard from "@/components/courses/CourseCard"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGoal } from "@/components/providers/GoalProvider"
import StudentPageHeader from "@/components/layout/StudentPageHeader"
import StudentPageToolbar from "@/components/layout/StudentPageToolbar"
import { ALL_GOAL_COURSES } from "@/lib/goal-courses-data"
import { classifyCourse, isCourseMatchingGoal } from "@/lib/course-classifier"

interface Course {
    id: string
    title: string
    slug: string
    description: string
    thumbnailUrl: string | null
    difficulty: string
    rating: number
    enrollmentCount: number
    duration: string | number
    isPremium: boolean
    tags?: string[]
    goalId?: string
    category?: string
    subject?: string
}

interface CourseClientProps {
    dbCourses?: Course[]
    enrolledCourseIds: string[]
    completedCourseIds: string[]
    bookmarkedCourseIds: string[]
    badgeMap?: Record<string, any>
    serverGoalIds?: string[]
}

export default function CourseClient({
    dbCourses = [],
    enrolledCourseIds,
    badgeMap = {},
    serverGoalIds = [],
}: CourseClientProps) {
    const { selectedGoal, selectedGoals } = useGoal()

    const allCourses = useMemo(() => {
        const combined: Course[] = [...ALL_GOAL_COURSES]
        dbCourses.forEach((dbc) => {
            const classified = classifyCourse(dbc)
            // Text-based tutorials do NOT belong in the Video Courses catalog
            if (classified.isTutorial) return

            if (!combined.some((c) => c.id === dbc.id || c.slug === dbc.slug)) {
                combined.push({
                    ...dbc,
                    goalId: dbc.goalId || classified.goalId,
                    category: dbc.category || classified.category,
                    subject: dbc.subject || classified.subject,
                    tags: dbc.tags && dbc.tags.length > 0 ? dbc.tags : classified.tags,
                })
            }
        })
        return combined
    }, [dbCourses])

    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [filterByGoal, setFilterByGoal] = useState(true)

    // Reset selected category when goal changes
    useEffect(() => {
        setSelectedCategory("all")
    }, [selectedGoal.id])

    // Generate dynamic category tabs based on the active goal
    const categoryTabs = useMemo(() => {
        const gid = selectedGoal.id.toLowerCase()

        if (gid === "bpsc") {
            return [
                { id: "all", label: "All BPSC Courses" },
                { id: "bihar", label: "Bihar Special & GK" },
                { id: "gs", label: "General Studies" },
                { id: "mains", label: "Mains Answer Writing" },
                { id: "csat", label: "CSAT & Mental Ability" },
            ]
        }

        if (gid === "upsc") {
            return [
                { id: "all", label: "All UPSC Courses" },
                { id: "gs", label: "GS Prelims + Mains" },
                { id: "polity", label: "Polity & Constitution" },
                { id: "history", label: "Modern History" },
                { id: "csat", label: "CSAT Paper II" },
            ]
        }

        if (gid.startsWith("class-")) {
            return [
                { id: "all", label: `All ${selectedGoal.name}` },
                { id: "maths", label: "Mathematics" },
                { id: "science", label: "Science (Physics, Chem, Bio)" },
                { id: "sst", label: "Social Science" },
                { id: "english", label: "English Language" },
            ]
        }

        if (gid === "govt-exams" || gid === "ssc") {
            return [
                { id: "all", label: "All Govt Exams" },
                { id: "ssc", label: "SSC CGL / CHSL" },
                { id: "gk", label: "Static GK & Current" },
                { id: "banking", label: "Banking IBPS / SBI" },
                { id: "railway", label: "Railways RRB" },
            ]
        }

        if (gid === "skills") {
            return [
                { id: "all", label: "All Tech Tracks" },
                { id: "python", label: "Python & Coding" },
                { id: "web", label: "Fullstack Web & Next.js" },
                { id: "data", label: "Data Science & AI" },
                { id: "dsa", label: "DSA & LeetCode" },
            ]
        }

        if (gid === "data-science") {
            return [
                { id: "all", label: "All Data Science & AI" },
                { id: "python", label: "Python & Analytics" },
                { id: "data", label: "Machine Learning & AI" },
                { id: "deep-learning", label: "Deep Learning & LLMs" },
                { id: "sql", label: "SQL & Databases" },
            ]
        }

        if (gid === "dsa-interview") {
            return [
                { id: "all", label: "All DSA & Interviews" },
                { id: "dsa", label: "Data Structures & Algos" },
                { id: "leetcode", label: "LeetCode & Patterns" },
                { id: "system", label: "System Design" },
            ]
        }

        return [
            { id: "all", label: "All Topics" },
            { id: "cs", label: "CS & Programming" },
            { id: "data", label: "Data Analysis" },
            { id: "math", label: "Math" },
            { id: "science", label: "Science" },
        ]
    }, [selectedGoal])

    const filteredCourses = useMemo(() => {
        let result = allCourses

        // 1. Goal-based curation filter (multi-goal OR logic)
        if (filterByGoal && selectedGoals.length > 0) {
            result = result.filter(c => {
                return selectedGoals.some(g => {
                    const gid = g.id.toLowerCase()
                    const gTags = (g.tags || []).map(t => t.toLowerCase())
                    return isCourseMatchingGoal(c, gid, gTags)
                })
            })
        }

        // 2. Category Tab Filter (topic, not enrolment status)
        if (selectedCategory !== "all") {
            const catLower = selectedCategory.toLowerCase()
            result = result.filter(c => {
                const text = `${c.title} ${c.description} ${c.subject || ""} ${c.tags?.join(" ") || ""}`.toLowerCase()
                if (catLower === "bihar") return text.includes("bihar")
                if (catLower === "gs") return text.includes("gs") || text.includes("general studies") || text.includes("prelims")
                if (catLower === "mains") return text.includes("mains") || text.includes("answer writing")
                if (catLower === "csat") return text.includes("csat") || text.includes("aptitude") || text.includes("reasoning")
                if (catLower === "polity") return text.includes("polity") || text.includes("constitution")
                if (catLower === "history") return text.includes("history") || text.includes("culture")
                if (catLower === "maths" || catLower === "math") return text.includes("math") || text.includes("calculus") || text.includes("algebra")
                if (catLower === "science") return text.includes("science") || text.includes("physics") || text.includes("chemistry") || text.includes("biology")
                if (catLower === "sst") return text.includes("social") || text.includes("sst") || text.includes("history") || text.includes("civics") || text.includes("geography")
                if (catLower === "english") return text.includes("english") || text.includes("grammar")
                if (catLower === "ssc") return text.includes("ssc") || text.includes("cgl")
                if (catLower === "gk") return text.includes("gk") || text.includes("awareness") || text.includes("current")
                if (catLower === "banking") return text.includes("bank") || text.includes("ibps") || text.includes("sbi")
                if (catLower === "railway") return text.includes("railway") || text.includes("rrb") || text.includes("ntpc")
                if (catLower === "python") return text.includes("python")
                if (catLower === "data") return text.includes("data") || text.includes("machine learning") || text.includes("ai")
                if (catLower === "deep-learning" || catLower === "ai") return text.includes("deep learning") || text.includes("neural") || text.includes("llm") || text.includes("pytorch") || text.includes("gen ai") || text.includes("generative ai")
                if (catLower === "sql") return text.includes("sql") || text.includes("database") || text.includes("analytics")
                if (catLower === "web") return text.includes("web") || text.includes("next.js") || text.includes("fullstack")
                if (catLower === "dsa") return text.includes("dsa") || text.includes("data structure") || text.includes("algorithm")
                if (catLower === "leetcode" || catLower === "algo") return text.includes("leetcode") || text.includes("algorithm") || text.includes("blind 75")
                if (catLower === "system") return text.includes("system design") || text.includes("architecture") || text.includes("design")
                if (catLower === "cs") return text.includes("python") || text.includes("programming") || text.includes("web")
                return true
            })
        }

        // 3. Search Filter
        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(c =>
                c.title.toLowerCase().includes(searchLower) ||
                c.description.toLowerCase().includes(searchLower)
            )
        }

        return result
    }, [allCourses, search, selectedCategory, filterByGoal, selectedGoals])

    return (
        <div className="space-y-6">
            <StudentPageHeader
                title="Explore courses"
                subtitle="Interactive, syllabus-aligned courses curated for your target goals"
            />

            <StudentPageToolbar
                search={<SearchBar value={search} onChange={setSearch} />}
                chips={<CourseTabs tabs={categoryTabs} activeTab={selectedCategory} onChange={setSelectedCategory} variant="pills" />}
            />

            {/* Main Content: Full-width Course Grid */}
            <div className="w-full pb-32 lg:pb-20">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span>
                        Showing <span className="font-bold text-gray-900 dark:text-white">{filteredCourses.length}</span> {filteredCourses.length === 1 ? 'course' : 'courses'}
                        {filterByGoal && ` for ${selectedGoal.name}`}
                    </span>
                    <button
                        type="button"
                        onClick={() => setFilterByGoal(!filterByGoal)}
                        className="ml-auto inline-flex min-h-[44px] items-center text-xs font-semibold text-teal-700 hover:underline sm:min-h-0 dark:text-teal-400"
                    >
                        {filterByGoal ? "Show courses for all exams" : "Show only my exam courses"}
                    </button>
                </div>

                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {filteredCourses.map((course, index) => (
                            <CourseCard
                                key={course.id}
                                course={course as any}
                                enrolled={enrolledCourseIds.includes(course.id)}
                                progress={0}
                                index={index}
                                promoBadge={badgeMap[course.id] || badgeMap[course.slug] || null}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                        <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3 stroke-[1.5]" />
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No courses match your criteria</p>
                        <p className="text-xs text-gray-400 mt-1 mb-3">
                            Try selecting a different topic or turning off the goal filter.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setFilterByGoal(false)
                                setSelectedCategory("all")
                                setSearch("")
                            }}
                            className="text-xs font-semibold"
                        >
                            Show All Courses
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
