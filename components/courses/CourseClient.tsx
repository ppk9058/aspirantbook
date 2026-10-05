"use client"

import { useState, useMemo, useEffect } from "react"
import SearchBar from "@/components/courses/SearchBar"
import CourseTabs from "@/components/courses/CourseTabs"
import CourseCard from "@/components/courses/CourseCard"
import { BookOpen, Sparkles, Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGoal } from "@/components/providers/GoalProvider"
import GoalIcon from "@/components/layout/GoalIcon"
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
}

export default function CourseClient({
    dbCourses = [],
    enrolledCourseIds,
    completedCourseIds,
    bookmarkedCourseIds,
    badgeMap = {},
}: CourseClientProps) {
    const { selectedGoal, openGoalModal } = useGoal()

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
    const [activeTab, setActiveTab] = useState("all")
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

        // 1. Goal-based curation filter
        if (filterByGoal && selectedGoal) {
            const gid = selectedGoal.id.toLowerCase()
            const gTags = (selectedGoal.tags || []).map(t => t.toLowerCase())

            result = result.filter(c => isCourseMatchingGoal(c, gid, gTags))
        }

        // 2. Active Tab (Enrolled / Completed / Bookmarked)
        if (activeTab === 'my') {
            result = result.filter(c => enrolledCourseIds.includes(c.id))
        } else if (activeTab === 'completed') {
            result = result.filter(c => completedCourseIds.includes(c.id))
        } else if (activeTab === 'bookmarked') {
            result = result.filter(c => bookmarkedCourseIds.includes(c.id))
        }

        // 3. Category Tab Filter
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

        // 4. Search Filter
        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(c =>
                c.title.toLowerCase().includes(searchLower) ||
                c.description.toLowerCase().includes(searchLower)
            )
        }

        return result
    }, [allCourses, search, activeTab, selectedCategory, filterByGoal, selectedGoal, enrolledCourseIds, completedCourseIds, bookmarkedCourseIds])

    const tabs = [
        { id: 'all', label: filterByGoal ? `${selectedGoal.name} Courses` : 'All Courses', count: filteredCourses.length },
        { id: 'my', label: 'Enrolled', count: enrolledCourseIds.length },
        { id: 'completed', label: 'Completed', count: completedCourseIds.length },
    ]

    return (
        <div className="space-y-6">
            {/* Header with Title & Filter Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Explore Courses
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Interactive, syllabus-aligned courses curated for your target goal
                    </p>
                </div>

            </div>

            {/* Active Goal Dynamic Banner */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-blue-500/10 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3AAFA9] to-[#1DB954] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                        <GoalIcon name={selectedGoal.icon} className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                                Active Goal
                            </span>
                            <h2 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                                {selectedGoal.fullName || selectedGoal.name}
                            </h2>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {filterByGoal
                                ? `Showing courses and subjects curated for ${selectedGoal.name}.`
                                : `Showing all courses across all exams and domains.`}
                        </p>
                    </div>
                </div>

                <div data-scroll-x="true" className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterByGoal(!filterByGoal)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            filterByGoal
                                ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-300 shadow-2xs hover:bg-slate-50"
                                : "bg-teal-600 text-white border-teal-600 shadow-sm hover:bg-teal-700"
                        }`}
                    >
                        {filterByGoal ? "Show All Courses" : `Show Only ${selectedGoal.name}`}
                    </button>
                    <button
                        onClick={openGoalModal}
                        className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                    >
                        <span>Change Goal</span>
                        <ChevronRight className="h-3.5 w-3.5 text-teal-500" />
                    </button>
                </div>
            </div>

            {/* Category Pills (Dynamic according to Goal) */}
            <div>
                <CourseTabs
                    tabs={categoryTabs}
                    activeTab={selectedCategory}
                    onChange={setSelectedCategory}
                    variant="pills"
                />
            </div>

            {/* Search & Tabs Row */}
            <div className="space-y-4">
                <SearchBar value={search} onChange={setSearch} />
                <CourseTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />
            </div>

            {/* Main Content: Full-width Course Grid */}
            <div className="w-full">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center justify-between">
                    <span>
                        Showing <span className="font-bold text-gray-900 dark:text-white">{filteredCourses.length}</span> {filteredCourses.length === 1 ? 'course' : 'courses'}
                        {filterByGoal && ` for ${selectedGoal.name}`}
                    </span>
                    {filterByGoal && (
                        <button
                            onClick={() => setFilterByGoal(false)}
                            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                        >
                            View all courses
                        </button>
                    )}
                </div>

                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {filteredCourses.map((course, index) => (
                            <CourseCard
                                key={course.id}
                                course={course as any}
                                enrolled={enrolledCourseIds.includes(course.id)}
                                progress={enrolledCourseIds.includes(course.id) ? 35 : 0}
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
