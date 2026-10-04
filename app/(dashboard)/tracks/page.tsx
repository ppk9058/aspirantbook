import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Compass, Sparkles, BookOpen, Clock, ArrowRight, Target, CheckCircle2, ShieldCheck } from "lucide-react"

export default async function TracksPage({
    searchParams,
}: {
    searchParams?: Promise<{ tab?: string }>
}) {
    const resolvedParams = searchParams ? await searchParams : {}
    const activeTab = resolvedParams.tab === "skills" ? "skills" : "career"

    let tracks: any[] = []

    try {
        tracks = await prisma.track.findMany({
            where: {
                isPublished: true,
            },
            include: {
                _count: {
                    select: { courses: true },
                },
            },
            orderBy: {
                order: "asc",
            },
        })
    } catch {
        console.warn("Database offline on /tracks, serving fallback tracks.")
        tracks = [
            {
                id: "track-data-scientist",
                title: "Data Scientist Career Track",
                slug: "data-scientist-career",
                type: "CAREER",
                description: "Master Python, SQL, exploratory data analysis, machine learning algorithms, and real-world predictive modeling.",
                thumbnail: "/batch-blue.svg",
                _count: { courses: 8 },
            },
            {
                id: "track-fullstack-ai",
                title: "AI & Fullstack Engineer Track",
                slug: "fullstack-ai-career",
                type: "CAREER",
                description: "Build AI-powered fullstack software, LLM APIs, retrieval-augmented generation (RAG), and vector search.",
                thumbnail: "/batch-purple.svg",
                _count: { courses: 6 },
            },
            {
                id: "track-python-specialist",
                title: "Python Fundamentals & Beyond",
                slug: "python-specialist-skill",
                type: "SKILL",
                description: "Deep dive into object-oriented programming, concurrency, data structures, and algorithmic problem solving.",
                thumbnail: "/batch-green.svg",
                _count: { courses: 4 },
            },
            {
                id: "track-sql-analyst",
                title: "Advanced SQL & Database Analytics",
                slug: "sql-analyst-skill",
                type: "SKILL",
                description: "Master complex analytical queries, partitioning, database optimization, and warehouse reporting.",
                thumbnail: "/batch-emerald.svg",
                _count: { courses: 3 },
            },
        ]
    }

    const careerTracks = tracks.filter((t) => t.type === "CAREER")
    const skillTracks = tracks.filter((t) => t.type === "SKILL")

    const displayedTracks = activeTab === "skills" ? skillTracks : careerTracks

    return (
        <div className="space-y-6 sm:space-y-8 pb-32 sm:pb-24 lg:pb-12">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#05192D] via-[#0a2540] to-[#0d2f52] p-6 sm:p-10 text-white border border-gray-800 shadow-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
                        <Compass className="h-3.5 w-3.5" />
                        <span>Curated Structured Paths</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
                        Learning Tracks
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-2xl">
                        Step-by-step roadmaps that connect individual courses into cohesive industry-aligned skillsets.
                    </p>

                    {/* Integrated Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                        <Link
                            href="/tracks?tab=career"
                            className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-xs ${
                                activeTab === "career"
                                    ? "bg-teal-700 hover:bg-teal-800 text-white"
                                    : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                            }`}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Career Tracks ({careerTracks.length})</span>
                        </Link>

                        <Link
                            href="/tracks?tab=skills"
                            className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-xs ${
                                activeTab === "skills"
                                    ? "bg-teal-700 hover:bg-teal-800 text-white"
                                    : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
                            }`}
                        >
                            <Target className="h-3.5 w-3.5" />
                            <span>Skill Tracks ({skillTracks.length})</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Track Listing */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {activeTab === "career" ? "Career Tracks (Job-Ready Roadmaps)" : "Skill Tracks (Focused Mastery)"}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            {activeTab === "career"
                                ? "Comprehensive programs taking you from foundational concepts to production-grade applications."
                                : "Modular tracks focused on mastering specific frameworks, libraries, or workflows."}
                        </p>
                    </div>
                </div>

                {displayedTracks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {displayedTracks.map((track) => (
                            <Link
                                key={track.id}
                                href={`/tracks/${track.slug}`}
                                className="group flex flex-col justify-between bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-teal-500/50 shadow-xs hover:shadow-lg transition-all p-5"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                                            {track.type}
                                        </span>
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            {track._count.courses} Courses
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                                        {track.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                                        {track.description}
                                    </p>
                                </div>

                                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-teal-700 dark:text-teal-400">
                                    <span>Explore Track</span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center text-slate-600 dark:text-slate-400">
                        <BookOpen className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-500 mb-2 stroke-[1.5]" />
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            No {activeTab === "career" ? "Career" : "Skill"} Tracks currently published
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                            Check back shortly or browse our full individual course catalog.
                        </p>
                        <div className="mt-4">
                            <Link
                                href="/courses"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-colors"
                            >
                                <span>Browse Courses</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
