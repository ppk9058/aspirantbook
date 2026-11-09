"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BookOpen,
    Edit,
    Eye,
    FileText,
    Search,
    Sparkles,
    CheckCircle2,
    Clock,
    ChevronDown,
    ChevronUp,
    Play,
    Plus,
    Layers,
    Filter,
} from "lucide-react"
import { cleanDescriptionSnippet, formatDate, pluralize } from "@/lib/utils"

interface Lesson {
    id: string
    title: string
    type?: string
    videoUrl?: string | null
}

interface Chapter {
    id: string
    title: string
    order?: number
    lessons: Lesson[]
}

export interface TutorialItem {
    id: string
    title: string
    slug: string
    description?: string | null
    status: string
    difficulty: string
    technology?: string | null
    createdAt?: string | Date
    updatedAt?: string | Date
    chapters?: Chapter[]
    _count?: {
        enrollments: number
    }
}

import { GoalSelectorBar } from "@/components/goals/GoalSelectorBar"

interface TutorialsClientViewProps {
    initialTutorials: TutorialItem[]
    userRole?: string | null
    currentGoal?: string | null
    goalIds?: string[]
}

export function TutorialsClientView({ initialTutorials, userRole, currentGoal, goalIds = [] }: TutorialsClientViewProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("ALL")
    const [selectedDifficulty, setSelectedDifficulty] = useState("ALL")
    const [expandedTutorialId, setExpandedTutorialId] = useState<string | null>(null)

    const canEdit = userRole === "ADMIN" || userRole === "TEACHER"

    // Derive available technology categories strictly relevant to the active goal's tutorials
    const categories = useMemo(() => {
        const set = new Set<string>()
        initialTutorials.forEach((t) => {
            if (t.technology) {
                t.technology
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach((tech) => set.add(tech))
            }
        })
        return ["ALL", ...Array.from(set)]
    }, [initialTutorials])

    // Filter tutorials
    const filteredTutorials = useMemo(() => {
        return initialTutorials.filter((tutorial) => {
            const matchesSearch =
                !searchQuery ||
                tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (tutorial.description && tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (tutorial.technology && tutorial.technology.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesCategory =
                selectedCategory === "ALL" ||
                (tutorial.technology &&
                    tutorial.technology
                        .toLowerCase()
                        .split(",")
                        .map((s) => s.trim())
                        .includes(selectedCategory.toLowerCase()))

            const matchesDifficulty =
                selectedDifficulty === "ALL" ||
                tutorial.difficulty.toUpperCase() === selectedDifficulty.toUpperCase()

            return matchesSearch && matchesCategory && matchesDifficulty
        })
    }, [initialTutorials, searchQuery, selectedCategory, selectedDifficulty])

    const toggleExpand = (id: string) => {
        setExpandedTutorialId((prev) => (prev === id ? null : id))
    }

    return (
        <div className="space-y-6">
            {/* Header Section matching Tutorial Studio design */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase bg-[#3A10E5] text-white flex items-center gap-1.5 shadow-[2px_2px_0px_#10162F]">
                            <FileText className="w-3.5 h-3.5" />
                            Text Tutorials
                        </span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            🌹 Rosera Rich Curriculum
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10162F] dark:text-white tracking-tight">
                        Text-Based Tutorials
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm font-medium max-w-3xl leading-relaxed">
                        Explore in-depth, hands-on tutorials with interactive code blocks, diagrams, and step-by-step concepts.
                    </p>
                </div>

                {canEdit && (
                    <div className="flex items-center gap-2">
                        <Link href="/admin/tutorials">
                            <Button
                                variant="outline"
                                className="border-2 border-[#10162F] dark:border-gray-600 font-bold shadow-[2px_2px_0px_#10162F] dark:shadow-[2px_2px_0px_#374151] hover:bg-gray-100 text-xs text-[#10162F] dark:text-white"
                            >
                                <Layers className="h-3.5 w-3.5 mr-1" />
                                Tutorial Studio
                            </Button>
                        </Link>
                        <Link href="/admin/tutorials/new">
                            <Button className="bg-[#3A10E5] hover:bg-[#300ec2] text-white font-extrabold border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] flex items-center gap-1.5 text-xs sm:text-sm">
                                <Plus className="h-4 w-4" />
                                + Create Tutorial
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Shared Goal & Exam Target Bar - thin strip */}
            <GoalSelectorBar
                title="Target Exams & Tutorials"
                compact={true}
            />

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-800">
                <div className="relative flex-1 max-w-md lg:max-w-none lg:flex-1 lg:min-w-[320px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tutorials by title, topic, or keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-[#0B132B] border-2 border-[#10162F] dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A10E5] shadow-[2px_2px_0px_#10162F] dark:shadow-[2px_2px_0px_#374151] text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-shrink-0 max-w-full md:max-w-[60%] lg:max-w-[55%]">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border-2 ${
                                selectedCategory === cat
                                    ? "bg-[#3A10E5] text-white border-[#10162F] shadow-[2px_2px_0px_#10162F]"
                                    : "bg-white dark:bg-[#0B132B] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-[#10162F]"
                            }`}
                        >
                            {cat === "ALL" ? "All Topics" : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tutorials List: auto-fill minmax(280px, 1fr) */}
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 items-stretch">
                {filteredTutorials.map((tutorial) => {
                    const totalLessons =
                        tutorial.chapters?.reduce((sum: number, ch) => sum + ch.lessons.length, 0) || 0

                    const firstLesson = tutorial.chapters?.[0]?.lessons?.[0]
                    const readHref = `/tutorials/${tutorial.slug || tutorial.id}`

                    const isExpanded = expandedTutorialId === tutorial.id

                    // Color theme based on technology
                    const tech = tutorial.technology?.toLowerCase() || ""
                    let accentBorder = "hover:border-[#3A10E5]"
                    if (tech.includes("python")) accentBorder = "hover:border-amber-500"
                    if (tech.includes("ai")) accentBorder = "hover:border-indigo-600"
                    if (tech.includes("c")) accentBorder = "hover:border-cyan-600"

                    return (
                        <Card
                            key={tutorial.id}
                            className={`border-2 border-[#10162F] dark:border-gray-700 shadow-[3px_3px_0px_#10162F] dark:shadow-[3px_3px_0px_#374151] overflow-hidden bg-white dark:bg-[#0B132B] transition-all h-full flex flex-col ${accentBorder}`}
                        >
                            <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-2.5">
                                    {/* Row 1: Title on its own row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <Link href={`/tutorials/${tutorial.slug || tutorial.id}`} className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-extrabold text-[#10162F] dark:text-white hover:text-[#3A10E5] transition-colors leading-snug">
                                                {tutorial.title}
                                            </h3>
                                        </Link>
                                    </div>

                                    {/* Row 2: Description */}
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 break-words leading-relaxed">
                                        {cleanDescriptionSnippet(tutorial.description, 200)}
                                    </p>

                                    {/* Row 3 & 4: Meta line split into two rows */}
                                    <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {/* Meta row 1: Difficulty & Technology full tag (no clipping) */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold border border-gray-200 dark:border-gray-700 shrink-0">
                                                {tutorial.difficulty}
                                            </span>
                                            <span className="font-extrabold text-[#10162F] dark:text-white bg-indigo-50/70 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900 whitespace-nowrap">
                                                {tutorial.technology || "General"}
                                            </span>
                                            {tutorial.status && (
                                                <Badge
                                                    variant={tutorial.status === "PUBLISHED" ? "default" : "secondary"}
                                                    className={
                                                        tutorial.status === "PUBLISHED"
                                                            ? "bg-emerald-600 text-white font-bold text-[10px]"
                                                            : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[10px]"
                                                    }
                                                >
                                                    {tutorial.status}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Meta row 2: Chapters, Lessons & Updated date */}
                                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-600 dark:text-gray-400">
                                            <span className="flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                                <BookOpen className="h-3.5 w-3.5 text-[#3A10E5]" />
                                                {pluralize(tutorial.chapters?.length || 0, "Chapter")}
                                            </span>
                                            <span>•</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                                {pluralize(totalLessons, "Text Lesson")}
                                            </span>
                                            {tutorial.updatedAt && (
                                                <>
                                                    <span className="hidden sm:inline shrink-0">•</span>
                                                    <span className="hidden sm:inline text-gray-400 shrink-0" suppressHydrationWarning>
                                                        Updated {formatDate(tutorial.updatedAt)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons on a separate row */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        {tutorial.chapters && tutorial.chapters.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleExpand(tutorial.id)}
                                                className="border-2 border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 text-xs min-h-[36px] text-gray-700 dark:text-gray-300 flex items-center gap-1 shrink-0"
                                            >
                                                Curriculum
                                                {isExpanded ? (
                                                    <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
                                                ) : (
                                                    <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                                                )}
                                            </Button>
                                        )}

                                        {canEdit && (
                                            <Link href={`/admin/tutorials/${tutorial.id}/edit`} className="shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-2 border-[#10162F] font-bold shadow-[2px_2px_0px_#10162F] hover:bg-[#FFF5EB] text-xs min-h-[36px] text-[#3A10E5] flex items-center gap-1"
                                                >
                                                    <Sparkles className="h-3.5 w-3.5 text-[#FFD15C]" />
                                                    Edit
                                                </Button>
                                            </Link>
                                        )}
                                    </div>

                                    <Link href={readHref} className="shrink-0 w-full sm:w-auto sm:ml-auto">
                                        <Button
                                            size="sm"
                                            className="bg-[#3A10E5] hover:bg-[#300ec2] text-white font-extrabold border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] flex items-center gap-1.5 text-xs min-h-[36px] px-3 w-full sm:w-auto active:translate-x-[1px] active:translate-y-[1px]"
                                        >
                                            <Play className="h-3.5 w-3.5 fill-current" />
                                            Start Tutorial
                                        </Button>
                                    </Link>
                                </div>

                                {/* Expanded Curriculum Preview */}
                                {isExpanded && tutorial.chapters && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5 animate-in fade-in-50 duration-200">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Curriculum Outline ({pluralize(tutorial.chapters.length, "Chapter")} • {pluralize(totalLessons, "Lesson")})
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {tutorial.chapters.map((ch, chIdx) => (
                                                <div
                                                    key={ch.id}
                                                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800"
                                                >
                                                    <div className="font-bold text-xs text-[#10162F] dark:text-white flex items-center gap-2 mb-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-[#3A10E5] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                                                            {chIdx + 1}
                                                        </span>
                                                        <span className="truncate">{ch.title}</span>
                                                    </div>
                                                    <div className="space-y-1 pl-7">
                                                        {ch.lessons.map((lesson) => (
                                                            <Link
                                                                key={lesson.id}
                                                                href={`/courses/${tutorial.slug || tutorial.id}#lesson-${lesson.id}`}
                                                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-[#3A10E5] dark:hover:text-[#818cf8] flex items-center gap-1.5 py-0.5 truncate transition-colors"
                                                            >
                                                                <FileText className="h-3 w-3 flex-shrink-0 text-gray-400" />
                                                                <span className="truncate">{lesson.title}</span>
                                                            </Link>
                                                        ))}
                                                        {ch.lessons.length === 0 && (
                                                            <span className="text-[11px] text-gray-400 italic">
                                                                No lessons yet
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}

                {filteredTutorials.length === 0 && (
                    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B132B]">
                        <CardContent className="p-8 sm:p-12 text-center max-w-lg mx-auto">
                            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            {searchQuery ? (
                                <>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                                        No matching tutorials found
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-xs">
                                        No tutorials matched &quot;{searchQuery}&quot;. Try clearing search or selecting a different category.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearchQuery("")
                                            setSelectedCategory("ALL")
                                            setSelectedDifficulty("ALL")
                                        }}
                                        className="min-h-[44px] border-2 border-[#10162F] font-bold text-xs"
                                    >
                                        Reset Filters
                                    </Button>
                                </>
                            ) : goalIds.length > 0 || currentGoal ? (
                                <>
                                    <h3 className="text-lg sm:text-xl font-extrabold text-[#10162F] dark:text-white mb-2 tracking-tight">
                                        No tutorials for {(currentGoal || goalIds[0] || "").toUpperCase()} yet
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-xs sm:text-sm leading-relaxed">
                                        We haven&apos;t published reading tutorials for {(currentGoal || goalIds[0] || "").toUpperCase()} yet. You can explore structured video courses or practice test series tailored for your target exam.
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <Link href="/courses" className="w-full sm:w-auto">
                                            <Button className="w-full sm:w-auto min-h-[44px] bg-[#3A10E5] hover:bg-[#300ec2] text-white font-bold text-xs px-5 shadow-[2px_2px_0px_#10162F] border-2 border-[#10162F]">
                                                Explore Courses
                                            </Button>
                                        </Link>
                                        <Link href="/test-series" className="w-full sm:w-auto">
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-auto min-h-[44px] border-2 border-[#10162F] dark:border-gray-600 font-bold text-xs px-5 shadow-[2px_2px_0px_#10162F] dark:shadow-none hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                Explore Test Series
                                            </Button>
                                        </Link>
                                        {canEdit && (
                                            <Link href="/admin/tutorials/new" className="w-full sm:w-auto">
                                                <Button
                                                    variant="secondary"
                                                    className="w-full sm:w-auto min-h-[44px] font-bold text-xs px-5 border-2 border-[#10162F]"
                                                >
                                                    + Create Tutorial
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                                        No Tutorials Found
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-xs">
                                        Tutorials authored in Tutorial Studio will appear here.
                                    </p>
                                    {canEdit && (
                                        <Link href="/admin/tutorials/new">
                                            <Button className="min-h-[44px] bg-[#3A10E5] hover:bg-[#300ec2] text-white font-bold">
                                                Create Tutorial
                                            </Button>
                                        </Link>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
