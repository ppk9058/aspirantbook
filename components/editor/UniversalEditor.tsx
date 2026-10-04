"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichContentEditor } from "./RichContentEditor"
import { VideoUpload } from "@/components/ui/video-upload"
import {
    ArrowLeft,
    Save,
    Send,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Eye,
    Edit3,
    BookOpen,
    Layers,
    Clock,
    Award
} from "lucide-react"

export type EntityType = "course" | "chapter" | "lesson" | "article" | "metadata"

export interface UniversalEditorData {
    title?: string
    description?: string
    content?: string
    difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    technology?: string
    duration?: number
    prerequisites?: string | string[]
    isPremium?: boolean
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
    type?: "READING" | "VIDEO" | "EXERCISE" | "TUTORIAL" | "CODE_ALONG" | "PROJECT" | "ASSESSMENT"
    videoUrl?: string
    xpReward?: number
    [key: string]: any
}

export interface UniversalEditorProps {
    mode: "create" | "edit"
    entityType: EntityType
    entityId?: string
    parentId?: string
    initialData?: UniversalEditorData
    permissions?: {
        canEdit?: boolean
        canPublish?: boolean
        canDelete?: boolean
    }
    breadcrumb?: string[]
    onSave: (data: UniversalEditorData, status?: "DRAFT" | "PUBLISHED") => Promise<void>
    onCancel?: () => void
    onDelete?: () => Promise<void>
    compact?: boolean
    className?: string
}

const LESSON_TYPES = [
    { value: "READING", label: "Reading Article / Tutorial" },
    { value: "VIDEO", label: "Video Lesson" },
    { value: "TUTORIAL", label: "Interactive Tutorial" },
    { value: "CODE_ALONG", label: "Guided Code Along" },
    { value: "EXERCISE", label: "Interactive Exercise" },
    { value: "PROJECT", label: "Capstone Project" },
    { value: "ASSESSMENT", label: "Quiz / Assessment" },
]

export function UniversalEditor({
    mode,
    entityType,
    entityId,
    parentId,
    initialData = {},
    permissions = { canEdit: true, canPublish: true, canDelete: false },
    breadcrumb = [],
    onSave,
    onCancel,
    onDelete,
    compact = false,
    className = "",
}: UniversalEditorProps) {
    // Form state
    const [title, setTitle] = useState(initialData.title || "")
    const [description, setDescription] = useState(initialData.description || "")
    const [content, setContent] = useState(initialData.content || "")
    const [difficulty, setDifficulty] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">(
        initialData.difficulty || "BEGINNER"
    )
    const [technology, setTechnology] = useState(initialData.technology || "")
    const [duration, setDuration] = useState<number | string>(
        initialData.duration !== undefined ? initialData.duration : ""
    )
    const [prerequisites, setPrerequisites] = useState(
        Array.isArray(initialData.prerequisites)
            ? initialData.prerequisites.join(", ")
            : initialData.prerequisites || ""
    )
    const [isPremium, setIsPremium] = useState(initialData.isPremium || false)
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
        initialData.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
    )
    const [lessonType, setLessonType] = useState<string>(initialData.type || "READING")
    const [videoUrl, setVideoUrl] = useState(initialData.videoUrl || "")
    const [xpReward, setXpReward] = useState<number | string>(
        initialData.xpReward !== undefined ? initialData.xpReward : 10
    )

    // Course Inclusions, Projects, and Skills Custom Metadata
    const [projectCount, setProjectCount] = useState<number | string>(
        initialData.projectCount !== undefined && initialData.projectCount !== null
            ? initialData.projectCount
            : ""
    )
    const [featuresTitle, setFeaturesTitle] = useState(
        initialData.featuresTitle || "This course includes"
    )
    const [features, setFeatures] = useState(
        Array.isArray(initialData.features)
            ? initialData.features.join("\n")
            : initialData.features || ""
    )
    const [skillsTitle, setSkillsTitle] = useState(
        initialData.skillsTitle || "Skills you'll gain"
    )
    const [skills, setSkills] = useState(
        Array.isArray(initialData.skills)
            ? initialData.skills.join("\n")
            : initialData.skills || ""
    )

    // UI state
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState("")
    const [isDirty, setIsDirty] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Autosave & Local Draft Recovery
    const storageKey = `aspirantbook_draft_${entityType}_${entityId || parentId || "new"}`
    const [autosaveTime, setAutosaveTime] = useState<string | null>(null)
    const [storedDraft, setStoredDraft] = useState<any>(null)

    // Check for existing local draft on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed && (parsed.title || parsed.content || parsed.description)) {
                    if (parsed.title !== initialData.title || parsed.content !== initialData.content) {
                        setStoredDraft(parsed)
                    }
                }
            }
        } catch {}
    }, [storageKey, initialData.title, initialData.content])

    // Periodic autosave every 15 seconds if dirty
    useEffect(() => {
        if (!isDirty) return

        const timer = setInterval(() => {
            try {
                const draftPayload = {
                    title,
                    description,
                    content,
                    difficulty,
                    technology,
                    duration,
                    prerequisites,
                    isPremium,
                    lessonType,
                    videoUrl,
                    xpReward,
                    savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                }
                localStorage.setItem(storageKey, JSON.stringify(draftPayload))
                setAutosaveTime(draftPayload.savedAt)
            } catch (err) {
                console.warn("Local autosave failed:", err)
            }
        }, 15000)

        return () => clearInterval(timer)
    }, [
        isDirty,
        storageKey,
        title,
        description,
        content,
        difficulty,
        technology,
        duration,
        prerequisites,
        isPremium,
        lessonType,
        videoUrl,
        xpReward,
    ])

    const handleRestoreDraft = () => {
        if (!storedDraft) return
        if (storedDraft.title !== undefined) setTitle(storedDraft.title)
        if (storedDraft.description !== undefined) setDescription(storedDraft.description)
        if (storedDraft.content !== undefined) setContent(storedDraft.content)
        if (storedDraft.difficulty !== undefined) setDifficulty(storedDraft.difficulty)
        if (storedDraft.technology !== undefined) setTechnology(storedDraft.technology)
        if (storedDraft.duration !== undefined) setDuration(storedDraft.duration)
        if (storedDraft.prerequisites !== undefined) setPrerequisites(storedDraft.prerequisites)
        if (storedDraft.isPremium !== undefined) setIsPremium(storedDraft.isPremium)
        if (storedDraft.lessonType !== undefined) setLessonType(storedDraft.lessonType)
        if (storedDraft.videoUrl !== undefined) setVideoUrl(storedDraft.videoUrl)
        if (storedDraft.xpReward !== undefined) setXpReward(storedDraft.xpReward)
        setStoredDraft(null)
    }

    const handleDismissDraft = () => {
        try {
            localStorage.removeItem(storageKey)
        } catch {}
        setStoredDraft(null)
    }

    // Mark dirty on changes
    useEffect(() => {
        setIsDirty(true)
    }, [
        title,
        description,
        content,
        difficulty,
        technology,
        duration,
        prerequisites,
        isPremium,
        status,
        lessonType,
        videoUrl,
        xpReward,
    ])

    const handleSave = async (targetStatus?: "DRAFT" | "PUBLISHED") => {
        if (!title.trim()) {
            setError("Title is required.")
            return
        }

        setError("")
        setIsSaving(true)

        const finalStatus = targetStatus || status

        const payload: UniversalEditorData = {
            title: title.trim(),
            status: finalStatus,
        }

        if (entityType === "course") {
            payload.description = description
            payload.difficulty = difficulty
            payload.technology = technology
            payload.duration = duration ? Number(duration) : 0
            payload.prerequisites = prerequisites
                ? prerequisites.split(",").map((s) => s.trim()).filter(Boolean)
                : []
            payload.isPremium = isPremium
            payload.projectCount = projectCount !== "" ? Number(projectCount) : undefined
            payload.featuresTitle = featuresTitle.trim()
            payload.features = features
                ? features
                      .split("\n")
                      .map((f: string) => f.trim())
                      .filter(Boolean)
                : []
            payload.skillsTitle = skillsTitle.trim()
            payload.skills = skills
                ? skills
                      .split("\n")
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                : []
        } else if (entityType === "chapter") {
            payload.description = description
        } else if (entityType === "lesson" || entityType === "article") {
            payload.type = lessonType as any
            payload.content = content
            payload.videoUrl = videoUrl || undefined
            payload.duration = duration ? Number(duration) : undefined
            payload.xpReward = xpReward ? Number(xpReward) : 10
        }

        try {
            await onSave(payload, finalStatus)
            setStatus(finalStatus)
            setIsDirty(false)
            try {
                localStorage.removeItem(storageKey)
            } catch {}
        } catch (err: any) {
            setError(err.message || "Failed to save changes. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        if (isDirty) {
            if (confirm("You have unsaved changes. Discard them?")) {
                onCancel?.()
            }
        } else {
            onCancel?.()
        }
    }

    const handleDelete = async () => {
        if (!onDelete) return
        setIsDeleting(true)
        try {
            await onDelete()
        } catch (err: any) {
            setError(err.message || "Failed to delete entity.")
            setIsDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    const getEntityLabel = () => {
        switch (entityType) {
            case "course":
                return "Course"
            case "chapter":
                return "Chapter / Module"
            case "lesson":
                return "Lesson / Article"
            case "article":
                return "Tutorial Article"
            default:
                return "Content Block"
        }
    }

    return (
        <div
            className={`bg-[#FFFDF9] border-2 border-[#10162F] rounded-2xl shadow-[4px_4px_0px_#10162F] overflow-hidden transition-all ${className}`}
        >
            {/* Editor Header */}
            <div className="bg-[#10162F] text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#10162F]">
                {/* Left: Back & Breadcrumbs */}
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Back"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                    )}

                    <div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-300">
                            <span className="px-2 py-0.5 rounded bg-[#3A10E5] text-white font-black text-[10px] uppercase tracking-wider border border-[#FFD15C]/30 shadow-xs">
                                🌹 Rosera Studio
                            </span>
                            <span>Editing {getEntityLabel()}</span>
                            {breadcrumb.length > 0 && (
                                <>
                                    <span>/</span>
                                    <span>{breadcrumb.join(" / ")}</span>
                                </>
                            )}
                        </div>
                        <h2 className="text-sm sm:text-base font-extrabold text-[#FFD15C] tracking-tight leading-tight mt-0.5">
                            {mode === "create" ? `Create New ${getEntityLabel()}` : title || "Untitled"}
                        </h2>
                    </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            status === "PUBLISHED"
                                ? "bg-[#FFD15C] text-[#10162F] border-[#FFD15C]"
                                : "bg-white/10 text-gray-200 border-white/20"
                        }`}
                    >
                        {status === "PUBLISHED" ? "● LIVE" : "○ DRAFT"}
                    </span>

                    {/* Cancel button */}
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="text-xs font-bold border-white/20 bg-white/5 hover:bg-white/10 text-white"
                        >
                            Cancel
                        </Button>
                    )}

                    {/* Save Draft button */}
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSave("DRAFT")}
                        disabled={isSaving}
                        className="bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/30"
                    >
                        {isSaving && status === "DRAFT" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                            <Save className="h-3.5 w-3.5 mr-1.5 text-gray-300" />
                        )}
                        Save Draft
                    </Button>

                    {/* Publish button */}
                    {permissions.canPublish !== false && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSave("PUBLISHED")}
                            disabled={isSaving}
                            className="bg-[#3A10E5] hover:bg-[#2f0ec0] text-white text-xs font-extrabold border border-[#FFD15C] shadow-[2px_2px_0px_#FFD15C]"
                        >
                            {isSaving && status === "PUBLISHED" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {status === "PUBLISHED" ? "Update Live" : "Publish"}
                        </Button>
                    )}

                    {/* Delete button */}
                    {permissions.canDelete && onDelete && mode === "edit" && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSaving || isDeleting}
                            className="p-1.5 rounded-lg text-red-300 hover:text-red-100 hover:bg-red-900/40 transition-colors ml-1"
                            title={`Delete ${getEntityLabel()}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border-b-2 border-red-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-bold text-red-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="text-red-400 hover:text-red-700 text-sm font-black"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Draft Recovery Banner */}
            {storedDraft && (
                <div className="bg-[#FFF5EB] border-b-2 border-[#FFD15C] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#10162F]">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#3A10E5] flex-shrink-0" />
                        <span>Uncommitted draft found from a previous session ({storedDraft.savedAt || "Recent"}). Restore edits?</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleRestoreDraft}
                            className="px-2.5 py-1 rounded bg-[#3A10E5] hover:bg-[#300ec2] text-white text-[11px] font-extrabold transition-colors"
                        >
                            Restore Draft
                        </button>
                        <button
                            type="button"
                            onClick={handleDismissDraft}
                            className="px-2 py-1 rounded hover:bg-black/10 text-gray-600 text-[11px] font-bold"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Form Fields Area */}
            <div className="p-4 sm:p-6 space-y-5">
                {/* Title Input */}
                <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-[#10162F] mb-1.5">
                        {getEntityLabel()} Title <span className="text-red-600">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSaving}
                        placeholder={`Enter ${getEntityLabel().toLowerCase()} title...`}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-[#10162F] rounded-xl text-sm sm:text-base font-bold text-[#10162F] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3A10E5] shadow-[2px_2px_0px_#10162F]"
                    />
                </div>

                {/* Course Metadata Schema Fields */}
                {entityType === "course" && (
                    <div className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            {/* Difficulty */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Skill Level
                                </label>
                                <select
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value as any)}
                                    disabled={isSaving}
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                >
                                    <option value="BEGINNER">Beginner</option>
                                    <option value="INTERMEDIATE">Intermediate</option>
                                    <option value="ADVANCED">Advanced</option>
                                </select>
                            </div>

                            {/* Technology */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Technology / Language
                                </label>
                                <input
                                    type="text"
                                    value={technology}
                                    onChange={(e) => setTechnology(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="e.g. Python, React, Java"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                            </div>

                            {/* Estimated Duration */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Duration (Hours)
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="e.g. 15"
                                    min="0"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                            </div>

                            {/* Number of Projects */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Projects Count
                                </label>
                                <input
                                    type="number"
                                    value={projectCount}
                                    onChange={(e) => setProjectCount(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="e.g. 14"
                                    min="0"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            {/* Prerequisites */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Prerequisites (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={prerequisites}
                                    onChange={(e) => setPrerequisites(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="e.g. Basic Computer Knowledge, Terminal Basics"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-medium text-[#10162F] focus:outline-none"
                                />
                            </div>

                            {/* Pro Tier Checkbox */}
                            <div className="pt-4 flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="isPremiumCourse"
                                    checked={isPremium}
                                    onChange={(e) => setIsPremium(e.target.checked)}
                                    disabled={isSaving}
                                    className="h-4 w-4 rounded accent-[#3A10E5]"
                                />
                                <label
                                    htmlFor="isPremiumCourse"
                                    className="text-xs font-extrabold text-[#10162F] cursor-pointer"
                                >
                                    Pro Subscription Only (Premium Track)
                                </label>
                            </div>
                        </div>

                        {/* Custom Sections: "This course includes" and "Skills you'll gain" */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#FFF5EB] rounded-2xl border-2 border-[#10162F]">
                            {/* "This course includes" Customizer */}
                            <div className="space-y-2">
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#10162F]">
                                    &quot;This Course Includes&quot; Section
                                </label>
                                <input
                                    type="text"
                                    value={featuresTitle}
                                    onChange={(e) => setFeaturesTitle(e.target.value)}
                                    placeholder="Section Title (e.g. This course includes)"
                                    disabled={isSaving}
                                    className="w-full px-3 py-1.5 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                                <label className="block text-[11px] font-bold text-gray-600">
                                    Inclusions (one item per line)
                                </label>
                                <textarea
                                    rows={4}
                                    value={features}
                                    onChange={(e) => setFeatures(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="AI assistance for guided coding help&#10;Projects to apply new skills&#10;Quizzes to test your knowledge"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-medium text-[#10162F] focus:outline-none"
                                />
                            </div>

                            {/* "Skills you'll gain" Customizer */}
                            <div className="space-y-2">
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#10162F]">
                                    &quot;Skills You&apos;ll Gain&quot; Section
                                </label>
                                <input
                                    type="text"
                                    value={skillsTitle}
                                    onChange={(e) => setSkillsTitle(e.target.value)}
                                    placeholder="Section Title (e.g. Skills you'll gain)"
                                    disabled={isSaving}
                                    className="w-full px-3 py-1.5 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                                <label className="block text-[11px] font-bold text-gray-600">
                                    Acquired Skills (one skill per line)
                                </label>
                                <textarea
                                    rows={4}
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="Build core programming concepts&#10;Write modular, object-oriented software&#10;Debug code and fix runtime exceptions"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-medium text-[#10162F] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Course Overview & Syllabus */}
                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#10162F] mb-1.5">
                                Course Overview & Syllabus Content
                            </label>
                            <RichContentEditor
                                value={description}
                                onChange={setDescription}
                                label="Course Description & Overview"
                                placeholder="# About this course\n\nExplain what students will learn..."
                                minHeight="280px"
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                )}

                {/* Chapter Schema Fields */}
                {entityType === "chapter" && (
                    <div className="space-y-4 pt-1">
                        <div>
                            <RichContentEditor
                                value={description}
                                onChange={setDescription}
                                label="Chapter Content"
                                placeholder="# Chapter Title\n\nWrite your blog post / chapter content here... Use headings, paragraphs, code snippets, tables, images, and highlight markers."
                                minHeight="420px"
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                )}

                {/* Lesson / Article Schema Fields */}
                {(entityType === "lesson" || entityType === "article") && (
                    <div className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Lesson Type */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Content Format / Type
                                </label>
                                <select
                                    value={lessonType}
                                    onChange={(e) => setLessonType(e.target.value)}
                                    disabled={isSaving}
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                >
                                    {LESSON_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Estimated Reading / Completion Duration (min) */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    Duration (Minutes)
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="15"
                                    min="1"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                            </div>

                            {/* XP Reward */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F] mb-1">
                                    XP Reward
                                </label>
                                <input
                                    type="number"
                                    value={xpReward}
                                    onChange={(e) => setXpReward(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="10"
                                    min="0"
                                    className="w-full px-3 py-2 bg-white border-2 border-[#10162F] rounded-xl text-xs font-bold text-[#10162F] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Video Upload or URL if Video */}
                        {lessonType === "VIDEO" && (
                            <div className="p-4 bg-[#FFF5EB] border-2 border-[#10162F] rounded-xl space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#10162F]">
                                    Video Upload or Direct Media Stream
                                </label>
                                <VideoUpload
                                    value={videoUrl}
                                    onChange={setVideoUrl}
                                    disabled={isSaving}
                                    folder="lessons/videos"
                                />
                                <div className="pt-2">
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                        Or External Video URL (YouTube, Vimeo, MP4)
                                    </label>
                                    <input
                                        type="url"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Rich Content Editor for Articles, Readings, Tutorials */}
                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#10162F] mb-1.5">
                                Interactive Article & Lesson Content
                            </label>
                            <RichContentEditor
                                value={content}
                                onChange={setContent}
                                label="Lesson & Article Content"
                                placeholder="# Lesson Introduction\n\nWrite your interactive article, paragraphs, subparagraphs, tables, code snippets, charts, infographics, and media embeds..."
                                minHeight="380px"
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="pt-4 border-t-2 border-[#10162F] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {isDirty && (
                            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                Unsaved changes
                            </span>
                        )}
                        {autosaveTime && (
                            <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">
                                Draft saved locally ({autosaveTime})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="border-2 border-[#10162F] font-bold text-xs shadow-[2px_2px_0px_#10162F]"
                            >
                                Cancel
                            </Button>
                        )}

                        <Button
                            type="button"
                            onClick={() => handleSave("DRAFT")}
                            disabled={isSaving}
                            className="bg-gray-100 hover:bg-gray-200 text-[#10162F] border-2 border-[#10162F] font-bold text-xs shadow-[2px_2px_0px_#10162F]"
                        >
                            {isSaving && status === "DRAFT" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                                <Save className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Save Draft
                        </Button>

                        {permissions.canPublish !== false && (
                            <Button
                                type="button"
                                onClick={() => handleSave("PUBLISHED")}
                                disabled={isSaving}
                                className="bg-[#3A10E5] hover:bg-[#300ec2] text-white border-2 border-[#10162F] font-extrabold text-xs shadow-[2px_2px_0px_#10162F]"
                            >
                                {isSaving && status === "PUBLISHED" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {status === "PUBLISHED" ? "Update Live" : "Publish Live"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border-2 border-[#10162F] shadow-[4px_4px_0px_#10162F] p-6 max-w-md w-full space-y-4">
                        <div className="flex items-center gap-3 text-red-600">
                            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
                            <h3 className="text-lg font-extrabold text-[#10162F]">
                                Delete {getEntityLabel()}?
                            </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                            Are you sure you want to delete <span className="font-extrabold text-[#10162F]">&quot;{title}&quot;</span>?
                            {entityType === "chapter" && " This will also permanently delete all lessons within this module."}
                            {" This action cannot be undone."}
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold border-2 border-[#10162F]"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, Delete Permanently"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
