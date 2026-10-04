"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    Search,
    Filter,
    Shuffle,
    CheckCircle2,
    Circle,
    Lock,
    Unlock,
    Bookmark,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Code2,
    X,
    ExternalLink,
    Check,
    RotateCcw,
    ArrowRight,
    SlidersHorizontal
} from "lucide-react"
import {
    CODING_PROBLEMS,
    TOP_COMPANIES,
    TOPIC_FILTERS,
    CodingProblem
} from "@/lib/coding-practice-data"

export default function CodingPracticeView() {
    const router = useRouter()

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All")
    const [selectedStatus, setSelectedStatus] = useState<string>("All") // "All" | "Solved" | "Unsolved"
    const [selectedTopic, setSelectedTopic] = useState<string>("All")
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
    const [companyCategory, setCompanyCategory] = useState<"Global" | "Indian">("Global")
    const [companySearchQuery, setCompanySearchQuery] = useState("")

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState<number>(10)
    const [currentPage, setCurrentPage] = useState<number>(1)

    // Interactive bookmarks & solved state
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => {
        const initial = new Set<number>()
        CODING_PROBLEMS.forEach(p => {
            if (p.isBookmarked) initial.add(p.id)
        })
        return initial
    })

    const [solvedIds, setSolvedIds] = useState<Set<number>>(() => {
        const initial = new Set<number>()
        CODING_PROBLEMS.forEach(p => {
            if (p.isSolved) initial.add(p.id)
        })
        return initial
    })

    // Modals
    const [solutionProblem, setSolutionProblem] = useState<CodingProblem | null>(null)
    const [showCompanyPassModal, setShowCompanyPassModal] = useState(false)
    const [showFilterDrawer, setShowFilterDrawer] = useState(false)
    const [companyPassUnlocked, setCompanyPassUnlocked] = useState(false)

    // Toggle bookmark
    const toggleBookmark = (id: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setBookmarkedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Toggle solved
    const toggleSolved = (id: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setSolvedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Filtered Companies
    const filteredCompanies = useMemo(() => {
        return TOP_COMPANIES.filter(c => {
            const matchCategory = c.category === companyCategory
            const matchSearch = c.name.toLowerCase().includes(companySearchQuery.toLowerCase())
            return matchCategory && matchSearch
        })
    }, [companyCategory, companySearchQuery])

    // Filtered Problems
    const filteredProblems = useMemo(() => {
        return CODING_PROBLEMS.filter(p => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchTitle = p.title.toLowerCase().includes(q)
                const matchId = p.id.toString().includes(q)
                const matchTopics = p.topics.some(t => t.toLowerCase().includes(q))
                const matchCompanies = p.companies.some(c => c.toLowerCase().includes(q))
                if (!matchTitle && !matchId && !matchTopics && !matchCompanies) return false
            }

            if (selectedDifficulty !== "All" && p.difficulty !== selectedDifficulty) {
                return false
            }

            const isSolved = solvedIds.has(p.id)
            if (selectedStatus === "Solved" && !isSolved) return false
            if (selectedStatus === "Unsolved" && isSolved) return false

            if (selectedTopic !== "All" && !p.topics.includes(selectedTopic)) {
                return false
            }

            if (selectedCompany && !p.companies.includes(selectedCompany)) {
                return false
            }

            return true
        })
    }, [searchQuery, selectedDifficulty, selectedStatus, selectedTopic, selectedCompany, solvedIds])

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage))
    const paginatedProblems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredProblems.slice(start, start + itemsPerPage)
    }, [filteredProblems, currentPage, itemsPerPage])

    // Shuffle / Pick Random
    const handlePickRandom = () => {
        if (filteredProblems.length === 0) return
        const randomIndex = Math.floor(Math.random() * filteredProblems.length)
        const randomProblem = filteredProblems[randomIndex]
        router.push(`/practice/runner?id=${randomProblem.id}`)
    }

    // Reset all filters
    const handleResetFilters = () => {
        setSearchQuery("")
        setSelectedDifficulty("All")
        setSelectedStatus("All")
        setSelectedTopic("All")
        setSelectedCompany(null)
        setCurrentPage(1)
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-3 sm:p-6 lg:p-8 relative overflow-hidden">
            {/* Colorful Luminous Ambient Glows (No Blackness) */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-teal-200/40 via-emerald-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/40 via-indigo-100/30 to-purple-100/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-[600px] h-[400px] bg-gradient-to-tr from-amber-100/40 via-rose-100/30 to-teal-100/30 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[1520px] mx-auto space-y-6 relative z-10">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-black shadow-md shadow-teal-500/20">
                                <Code2 className="h-5 w-5" />
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                Coding Practice
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
                                Live Lab
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Curated company interview questions with real-time sandbox execution &amp; automated verification
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowCompanyPassModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 hover:from-indigo-700 hover:to-teal-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{companyPassUnlocked ? "Company Pass Active" : "Company Pass"}</span>
                        </button>
                    </div>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Search Bar & Problems Table */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                        {/* Top Controls Row */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 sm:px-4 shadow-sm">
                            {/* Search Input */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                    placeholder="Search problems..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Right Metadata & Action Buttons */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-600">
                                {/* Total Problems Badge */}
                                <div className="text-xs sm:text-sm font-semibold text-slate-600 tracking-tight whitespace-nowrap">
                                    <span className="font-extrabold text-teal-600">
                                        {filteredProblems.length === CODING_PROBLEMS.length ? "1,369" : filteredProblems.length}
                                    </span>{" "}
                                    problems
                                </div>

                                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                    {/* Filter Button */}
                                    <button
                                        onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                                        className={`p-2 rounded-xl border transition-all ${
                                            showFilterDrawer || selectedDifficulty !== "All" || selectedStatus !== "All" || selectedTopic !== "All" || selectedCompany
                                                ? "bg-teal-50 border-teal-300 text-teal-700"
                                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                                        }`}
                                        title="Filter Problems"
                                    >
                                        <Filter className="h-4 w-4" />
                                    </button>

                                    {/* Shuffle / Random Button */}
                                    <button
                                        onClick={handlePickRandom}
                                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-teal-600 transition-all"
                                        title="Pick Random Problem"
                                    >
                                        <Shuffle className="h-4 w-4" />
                                    </button>

                                    {/* Reset Filters */}
                                    <button
                                        onClick={handleResetFilters}
                                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all"
                                        title="Reset All Filters"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {(selectedCompany || selectedDifficulty !== "All" || selectedStatus !== "All" || selectedTopic !== "All" || searchQuery) && (
                            <div className="flex flex-wrap items-center gap-2 px-1">
                                <span className="text-xs text-slate-500 font-medium">Active filters:</span>
                                {selectedCompany && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                                        <span>Company: {selectedCompany}</span>
                                        <button onClick={() => setSelectedCompany(null)} className="hover:text-blue-900">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {selectedDifficulty !== "All" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800">
                                        <span>Difficulty: {selectedDifficulty}</span>
                                        <button onClick={() => setSelectedDifficulty("All")} className="hover:text-amber-950">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {selectedStatus !== "All" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                                        <span>Status: {selectedStatus}</span>
                                        <button onClick={() => setSelectedStatus("All")} className="hover:text-emerald-950">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {selectedTopic !== "All" && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-700">
                                        <span>Topic: {selectedTopic}</span>
                                        <button onClick={() => setSelectedTopic("All")} className="hover:text-purple-950">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                <button
                                    onClick={handleResetFilters}
                                    className="text-xs text-slate-500 hover:text-teal-600 underline font-semibold ml-1"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                        {/* Expandable Filter Drawer */}
                        {showFilterDrawer && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <SlidersHorizontal className="h-4 w-4 text-teal-600" />
                                        <span>Filter Problems</span>
                                    </div>
                                    <button
                                        onClick={() => setShowFilterDrawer(false)}
                                        className="text-slate-400 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                    {/* Difficulty */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                                            Difficulty
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {["All", "Basic", "Core", "Pro"].map(diff => (
                                                <button
                                                    key={diff}
                                                    onClick={() => setSelectedDifficulty(diff)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                        selectedDifficulty === diff
                                                            ? "bg-teal-600 text-white font-black shadow-xs"
                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                                    }`}
                                                >
                                                    {diff}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                                            Status
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {["All", "Solved", "Unsolved"].map(stat => (
                                                <button
                                                    key={stat}
                                                    onClick={() => setSelectedStatus(stat)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                        selectedStatus === stat
                                                            ? "bg-indigo-600 text-white font-black shadow-xs"
                                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                                    }`}
                                                >
                                                    {stat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick Topic */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                                            Topic
                                        </label>
                                        <select
                                            value={selectedTopic}
                                            onChange={e => setSelectedTopic(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        >
                                            <option value="All">All Topics</option>
                                            {TOPIC_FILTERS.filter(t => t !== "All Topics").map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Problems Table Card (Light, Crisp, Colorful) */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    {/* Table Header */}
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-bold text-slate-700 tracking-wider">
                                            <th className="py-3.5 px-4 w-12 text-center">Status</th>
                                            <th className="py-3.5 px-4 font-extrabold text-slate-800">Problem</th>
                                            <th className="py-3.5 px-4 w-28">Difficulty</th>
                                            <th className="py-3.5 px-4 w-24 text-center">Companies</th>
                                            <th className="py-3.5 px-4 min-w-[180px]">Topics</th>
                                            <th className="py-3.5 px-4 w-24 text-center">Resources</th>
                                        </tr>
                                    </thead>

                                    {/* Table Body */}
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {paginatedProblems.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-12 text-slate-400">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Search className="h-8 w-8 text-slate-300" />
                                                        <span className="font-semibold text-slate-700">No problems found</span>
                                                        <span className="text-xs text-slate-400">
                                                            Try clearing your search query or loosening your filters.
                                                        </span>
                                                        <button
                                                            onClick={handleResetFilters}
                                                            className="mt-2 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100"
                                                        >
                                                            Reset Filters
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedProblems.map((p) => {
                                                const isSolved = solvedIds.has(p.id)
                                                const isBookmarked = bookmarkedIds.has(p.id)

                                                return (
                                                    <tr
                                                        key={p.id}
                                                        onClick={() => router.push(`/practice/runner?id=${p.id}`)}
                                                        onMouseEnter={() => router.prefetch(`/practice/runner?id=${p.id}`)}
                                                        className={`group cursor-pointer transition-colors ${
                                                            p.isPOTD
                                                                ? "bg-blue-50/40 hover:bg-blue-50/80"
                                                                : "hover:bg-slate-50/90"
                                                        }`}
                                                    >
                                                        {/* Status Column */}
                                                        <td className="py-3.5 px-4 text-center">
                                                            <button
                                                                onClick={(e) => toggleSolved(p.id, e)}
                                                                className="transition-transform group-hover:scale-110"
                                                                title={isSolved ? "Mark as unsolved" : "Mark as solved"}
                                                            >
                                                                {isSolved ? (
                                                                    <CheckCircle2 className="h-4 w-4 text-teal-600 fill-teal-100" />
                                                                ) : (
                                                                    <Circle className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                                                                )}
                                                            </button>
                                                        </td>

                                                        {/* Problem Title & Number */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                                                                    {p.id}. {p.title}
                                                                </span>

                                                                {/* POTD Badge */}
                                                                {p.isPOTD && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                                                                        <span>&lt;&gt;</span>
                                                                        <span>POTD</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Difficulty Column */}
                                                        <td className="py-3.5 px-4">
                                                            {p.difficulty === "Basic" && (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                                                                    Basic
                                                                </span>
                                                            )}
                                                            {p.difficulty === "Core" && (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
                                                                    Core
                                                                </span>
                                                            )}
                                                            {p.difficulty === "Pro" && (
                                                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
                                                                    Pro
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Companies Column */}
                                                        <td className="py-3.5 px-4 text-center">
                                                            {companyPassUnlocked ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Unlock className="h-3.5 w-3.5 text-teal-600" />
                                                                    <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[70px]">
                                                                        {p.companies[0]}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setShowCompanyPassModal(true)
                                                                    }}
                                                                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                                                    title={`Asked at: ${p.companies.join(", ")} (Click to view company pass)`}
                                                                >
                                                                    <Lock className="h-3.5 w-3.5 text-blue-600" />
                                                                </button>
                                                            )}
                                                        </td>

                                                        {/* Topics Column */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
                                                                    {p.topics[0]}
                                                                </span>
                                                                {p.topics.length > 1 && (
                                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                                        +{p.topics.length - 1} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Resources Column */}
                                                        <td className="py-3.5 px-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {/* Solution Flash Icon */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setSolutionProblem(p)
                                                                    }}
                                                                    className="p-1 rounded text-slate-400 hover:text-teal-600 transition-colors"
                                                                    title="View Solution & Editorial"
                                                                >
                                                                    <span className="font-black italic text-sm text-teal-600 group-hover:text-teal-700">
                                                                        F
                                                                    </span>
                                                                </button>

                                                                {/* Bookmark Icon */}
                                                                <button
                                                                    onClick={(e) => toggleBookmark(p.id, e)}
                                                                    className="p-1 rounded transition-colors"
                                                                    title={isBookmarked ? "Remove Bookmark" : "Bookmark Problem"}
                                                                >
                                                                    <Bookmark
                                                                        className={`h-4 w-4 ${
                                                                            isBookmarked
                                                                                ? "fill-amber-400 text-amber-500"
                                                                                : "text-slate-300 hover:text-slate-500"
                                                                        }`}
                                                                    />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Pagination Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/80">
                                {/* Items per page selector */}
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value))
                                            setCurrentPage(1)
                                        }}
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value={10}>10 per page</option>
                                        <option value={20}>20 per page</option>
                                        <option value={50}>50 per page</option>
                                    </select>
                                    <span className="text-slate-500">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
                                        {Math.min(currentPage * itemsPerPage, filteredProblems.length)} of{" "}
                                        {filteredProblems.length}
                                    </span>
                                </div>

                                {/* Numeric Pagination Controls */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>

                                    {[1, 2, 3].map(page => {
                                        if (page > totalPages) return null
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                    currentPage === page
                                                        ? "bg-teal-600 text-white font-black shadow-xs"
                                                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    })}

                                    {totalPages > 3 && (
                                        <>
                                            <span className="px-1 text-slate-400 text-xs">...</span>
                                            <button
                                                onClick={() => setCurrentPage(totalPages)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                    currentPage === totalPages
                                                        ? "bg-teal-600 text-white font-black shadow-xs"
                                                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                                }`}
                                            >
                                                {totalPages > 10 ? 137 : totalPages}
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Company Pass & Top Companies Sidebar */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                        {/* Card 1: Company Pass (Vibrant Blue/Indigo/Teal Gradient) */}
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-xl shadow-indigo-600/20 border border-white/20">
                            {/* Decorative background glows */}
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-teal-400/20 rounded-full blur-xl pointer-events-none" />

                            <div className="relative z-10 space-y-4">
                                {/* Top Badge */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-extrabold tracking-wide">
                                    <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300" />
                                    <span>Company Pass</span>
                                </div>

                                {/* Heading & Visual */}
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-white">
                                            Practice questions <br />
                                            by company
                                        </h3>
                                    </div>

                                    {/* 3D Floating Company Tile */}
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg shrink-0 transform rotate-3 hover:rotate-0 transition-transform">
                                        <div className="text-center font-black">
                                            <span className="text-amber-300 text-lg leading-none block">a</span>
                                            <span className="text-[10px] tracking-tighter text-white font-bold block">amazon</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Key Features Checklist */}
                                <div className="grid grid-cols-3 gap-2 py-1 text-center">
                                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/15">
                                        <span className="text-xs font-black block text-teal-100">DSA</span>
                                        <span className="text-[10px] text-white/90 block mt-0.5">Curated</span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/15">
                                        <span className="text-xs font-black block text-teal-100">Recent</span>
                                        <span className="text-[10px] text-white/90 block mt-0.5">Questions</span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/15">
                                        <span className="text-xs font-black block text-teal-100">Stay</span>
                                        <span className="text-[10px] text-white/90 block mt-0.5">Up to date</span>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={() => setShowCompanyPassModal(true)}
                                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 font-extrabold text-sm shadow-lg shadow-indigo-900/10 flex items-center justify-center gap-2 transition-all active:scale-98"
                                >
                                    <span>{companyPassUnlocked ? "View Company Pass Perks" : "Explore Company Pass"}</span>
                                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Top Companies (Clean White, Crisp, Interactive) */}
                        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-sm space-y-4">
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-extrabold text-slate-900">Top Companies</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    51 total
                                </span>
                            </div>

                            {/* Search Companies */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={companySearchQuery}
                                    onChange={e => setCompanySearchQuery(e.target.value)}
                                    placeholder="Search anything..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            {/* Category Switcher: Global | Indian */}
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                                <button
                                    onClick={() => setCompanyCategory("Global")}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        companyCategory === "Global"
                                            ? "bg-white text-slate-900 shadow-xs font-black"
                                            : "text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    Global
                                </button>
                                <button
                                    onClick={() => setCompanyCategory("Indian")}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        companyCategory === "Indian"
                                            ? "bg-white text-slate-900 shadow-xs font-black"
                                            : "text-slate-500 hover:text-slate-900"
                                    }`}
                                >
                                    Indian
                                </button>
                            </div>

                            {/* Company Chips Grid */}
                            <div className="flex flex-wrap gap-2 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                                {filteredCompanies.map(c => {
                                    const isSelected = selectedCompany === c.name
                                    return (
                                        <button
                                            key={c.name}
                                            onClick={() => {
                                                if (isSelected) setSelectedCompany(null)
                                                else {
                                                    setSelectedCompany(c.name)
                                                    setCurrentPage(1)
                                                }
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                isSelected
                                                    ? "bg-teal-600 text-white font-black shadow-sm border-teal-600"
                                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:border-slate-300"
                                            }`}
                                        >
                                            <span>{c.name}</span>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                                    isSelected
                                                        ? "bg-teal-800 text-teal-100"
                                                        : "bg-slate-200/80 text-slate-600"
                                                }`}
                                            >
                                                {c.count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Reset Company Filter Link if selected */}
                            {selectedCompany && (
                                <div className="pt-2 text-center border-t border-slate-100">
                                    <button
                                        onClick={() => setSelectedCompany(null)}
                                        className="text-xs text-teal-600 hover:underline font-bold"
                                    >
                                        Show All Companies
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Solution & Editorial Modal */}
            {solutionProblem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
                    <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div>
                                <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                    Official Editorial
                                </span>
                                <h3 className="text-lg font-black text-slate-900 mt-1">
                                    {solutionProblem.id}. {solutionProblem.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSolutionProblem(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Problem Description & Hints */}
                        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                            <h4 className="font-bold text-slate-900 text-sm">Key Approach &amp; Algorithm</h4>
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                <ul className="list-disc list-inside space-y-1.5 text-slate-700">
                                    {solutionProblem.hints.map((hint, i) => (
                                        <li key={i}>{hint}</li>
                                    ))}
                                </ul>
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm mt-3">Reference Solution (Python)</h4>
                            <pre className="p-3.5 rounded-2xl bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                                {solutionProblem.starterCode.python}
                            </pre>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Target Companies: {solutionProblem.companies.join(", ")}
                            </span>
                            <button
                                onClick={() => {
                                    const id = solutionProblem.id
                                    setSolutionProblem(null)
                                    router.push(`/practice/runner?id=${id}`)
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-sm transition-all"
                            >
                                <span>Open in Code Runner</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Company Pass Modal */}
            {showCompanyPassModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
                    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
                            <Sparkles className="h-8 w-8 text-amber-300" />
                        </div>

                        <div className="space-y-2">
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                Pro Member Access
                            </span>
                            <h3 className="text-2xl font-black text-slate-900">
                                All-Access Company Pass
                            </h3>
                            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                                Unlock 1,369+ verified interview questions tagged with exact company frequency scores and detailed video editorials.
                            </p>
                        </div>

                        {/* Perks */}
                        <div className="grid grid-cols-1 gap-2.5 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Check className="h-4 w-4 text-teal-600 shrink-0" />
                                <span>Full unlocked company tags for Google, Amazon, Meta &amp; Microsoft</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700">
                                <Check className="h-4 w-4 text-teal-600 shrink-0" />
                                <span>Recent 2025/2026 real interview question cycles</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700">
                                <Check className="h-4 w-4 text-teal-600 shrink-0" />
                                <span>Instant automated test runner sandbox with zero rate limits</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setCompanyPassUnlocked(true)
                                    setShowCompanyPassModal(false)
                                }}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-sm shadow-md shadow-teal-500/20 transition-all"
                            >
                                Activate Free Pass Now
                            </button>
                            <button
                                onClick={() => setShowCompanyPassModal(false)}
                                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
