"use client"

import React, { useState, useTransition, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createCourseDraft } from "@/lib/actions/admin/courses"
import { Button } from "@/components/ui/button"
import { RichContentEditor } from "@/components/editor/RichContentEditor"
import { TutorialImportModal } from "@/components/editor/TutorialImportModal"
import {
    Sparkles,
    BookOpen,
    Clock,
    Puzzle,
    CheckCircle2,
    Award,
    Shield,
    GraduationCap,
    Loader2,
    ArrowRight,
    ArrowLeft,
    FileText,
    Layers,
    Terminal,
    HelpCircle,
    Check
} from "lucide-react"

function NewTutorialForm() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState("")
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Form states
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState(
        `# About this tutorial\n\nLearn step-by-step with structured explanations, code alongs, and practical guides designed for deep conceptual clarity.\n\n### What you'll learn\n- [x] Core fundamental principles\n- [x] Practical real-world examples and step-by-step breakdown\n- [x] Common pitfalls and debugging strategies\n\n> [!TIP]\n> **Study Tip:** Read through each chapter and follow along with the code snippets to reinforce your learning!\n`
    )
    const [difficulty, setDifficulty] = useState("BEGINNER")
    const [technology, setTechnology] = useState("Python")
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!title.trim()) {
            setError("Please provide a tutorial title")
            return
        }
        if (!description.trim()) {
            setError("Please provide tutorial content")
            return
        }

        setError("")

        const formData = new FormData()
        formData.append("title", title)
        formData.append("description", description)
        formData.append("difficulty", difficulty)
        formData.append("technology", technology)
        formData.append("status", status)

        startTransition(async () => {
            try {
                const res = await createCourseDraft(null, formData)
                if (res?.error) {
                    setError(res.error)
                }
            } catch (err: any) {
                // If it's a redirect, next will handle it, or we navigate
                if (err.message !== "NEXT_REDIRECT") {
                    setError(err.message || "Failed to create tutorial")
                }
            }
        })
    }

    return (
        <div className="min-h-screen bg-[#FFFDF9] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="border-b-2 border-[#10162F] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Link
                                href="/admin/tutorials"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-black hover:underline mr-2"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to Tutorial Studio
                            </Link>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-[#3A10E5] text-white flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Tutorial Studio
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                🌹 Rosera Editor
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10162F] tracking-tight">
                            Create New Tutorial
                        </h1>
                        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                            Import an AI-generated multi-phase package directly, or compose a new tutorial manually using Rosera Editor.
                        </p>
                    </div>
                </div>

                {/* FAST TRACK CARD: 1-Click Import AI Package (Phase 1, 2, or Full Curriculum) */}
                <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#EEF2FF] via-[#FFFBEB] to-[#ECFDF5] border-2 border-[#10162F] shadow-[5px_5px_0px_#10162F] space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚡</span>
                                <h3 className="text-lg font-black text-[#10162F]">
                                    Have an AI Package or Multi-Phase File?
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white">
                                    Instant Build
                                </span>
                            </div>
                            <p className="text-xs text-gray-700 max-w-2xl leading-relaxed">
                                Skip manual form entry! Upload or paste your Phase 1 or multi-phase JSON / HTML package. Rosera will automatically construct the course, all chapters, and interactive lessons in a single click. Later, you can merge Phase 2+ seamlessly.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-5 py-3 rounded-xl border-2 border-[#10162F] bg-[#3A10E5] hover:bg-[#300ec2] text-white font-black text-sm shadow-[3px_3px_0px_#10162F] shrink-0 flex items-center justify-center gap-2 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4 text-[#FFD15C]" />
                            <span>📥 1-Click Import Package →</span>
                        </button>
                    </div>

                    {/* Supported Capabilities */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-200/80">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">🧪</span>
                            <span>Interactive Quizzes</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <span className="h-6 w-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center text-xs">⚡</span>
                            <span>Flowcharts &amp; Diagrams</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <span className="h-6 w-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs">💻</span>
                            <span>Code Snippets &amp; Terminal</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                            <span className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">🔄</span>
                            <span>Multi-Phase Merge Support</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 my-2">
                    <div className="h-px bg-gray-200 flex-1" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200">
                        Or Create Manually From Scratch
                    </span>
                    <div className="h-px bg-gray-200 flex-1" />
                </div>

                {/* Main Creation Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Tutorial Basics Card */}
                    <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[5px_5px_0px_0px_#10162F] space-y-6">
                        <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-4">
                            <BookOpen className="h-5 w-5 text-[#3A10E5]" />
                            <h2 className="text-lg sm:text-xl font-bold text-[#10162F]">
                                Tutorial Details & Technology
                            </h2>
                        </div>

                        {/* Title Input */}
                        <div>
                            <label className="block text-xs sm:text-sm font-extrabold text-[#10162F] mb-1.5 uppercase tracking-wide">
                                Tutorial Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="e.g. Intro to Python, Generative AI Masterclass, Data Structures in C"
                                className="w-full px-4 py-3 border-2 border-[#10162F] rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] mb-1.5 uppercase tracking-wide">
                                    Subject / Technology *
                                </label>
                                <input
                                    type="text"
                                    value={technology}
                                    onChange={(e) => setTechnology(e.target.value)}
                                    required
                                    placeholder="Python, Java, AI, Physics, C"
                                    className="w-full px-3 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] mb-1.5 uppercase tracking-wide">
                                    Difficulty Level *
                                </label>
                                <select
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    className="w-full px-3 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                >
                                    <option value="BEGINNER">Beginner</option>
                                    <option value="INTERMEDIATE">Intermediate</option>
                                    <option value="ADVANCED">Advanced</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] mb-1.5 uppercase tracking-wide">
                                    Initial Status *
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
                                    className="w-full px-3 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                >
                                    <option value="PUBLISHED">Published (Live for Students)</option>
                                    <option value="DRAFT">Draft (Under Review)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Rich Content Editor Card */}
                    <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-[#3A10E5]" />
                                <h2 className="text-lg sm:text-xl font-bold text-[#10162F]">
                                    Tutorial Overview &amp; Syllabus
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-gray-500">
                                Headings • Tables • Code • Callouts
                            </span>
                        </div>

                        <p className="text-xs text-gray-600">
                            Write an overview for your tutorial. You can add more chapters and lessons after creation:
                        </p>

                        <RichContentEditor
                            value={description}
                            onChange={setDescription}
                            label="Tutorial Content & Syllabus"
                            minHeight="380px"
                            placeholder="# Tutorial Introduction&#10;&#10;Write overview paragraphs, insert code snippets, comparison tables, and diagram images..."
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-700 text-sm font-semibold flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#10162F]">
                        <Link
                            href="/admin/tutorials"
                            className="px-4 py-2.5 rounded-xl border-2 border-[#10162F] text-[#10162F] font-bold text-xs bg-white hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </Link>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-extrabold text-sm px-6 py-2.5 rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving Tutorial...</span>
                                </>
                            ) : (
                                <>
                                    <span>
                                        {status === "DRAFT" ? "Create Tutorial Draft" : "Create & Publish Tutorial"}
                                    </span>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>

            {/* AI & Curriculum Package Import Modal */}
            <TutorialImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onApplyToEditor={(imported) => {
                    if (imported.title) setTitle(imported.title)
                    if (imported.technology) setTechnology(imported.technology)
                    if (imported.difficulty) setDifficulty(imported.difficulty)
                    if (imported.content) setDescription(imported.content)
                }}
            />
        </div>
    )
}

export default function NewTutorialPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3A10E5]" />
                </div>
            }
        >
            <NewTutorialForm />
        </Suspense>
    )
}

