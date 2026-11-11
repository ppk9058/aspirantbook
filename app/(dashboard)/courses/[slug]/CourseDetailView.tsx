"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Clock,
    Users,
    BookOpen,
    Lock,
    CheckCircle,
    Star,
    Sparkles,
    PlayCircle,
    BarChart2,
    Puzzle,
    CheckSquare,
    Info,
    GraduationCap,
    Check,
    FileText,
    Edit3,
    Plus,
    ArrowUp,
    ArrowDown,
    Trash2,
    Copy,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Home,
    ExternalLink,
    FileCode,
    Video
} from "lucide-react"
import { cleanDescriptionSnippet, safeParseJson } from "@/lib/utils"
import { inlineFmt } from "@/lib/rosera/inline"
import dynamic from "next/dynamic"
import { CodecademyContentRenderer } from "@/components/editor/CodecademyContentRenderer"
import { RoseraRenderer } from "@/components/editor/RoseraRenderer"

const RoseraEditor = dynamic(
    () => import("@/components/editor/RoseraEditor").then((m) => m.RoseraEditor),
    { ssr: false, loading: () => <div className="p-8 text-center text-sm text-gray-500 animate-pulse">Loading Editor...</div> }
)
const UniversalEditor = dynamic(
    () => import("@/components/editor/UniversalEditor").then((m) => m.UniversalEditor),
    { ssr: false, loading: () => <div className="p-8 text-center text-sm text-gray-500 animate-pulse">Loading Editor...</div> }
)
const TutorialImportModal = dynamic(
    () => import("@/components/editor/TutorialImportModal").then((m) => m.TutorialImportModal),
    { ssr: false }
)
import { AspirantbookTutorialView } from "@/components/editor/AspirantbookTutorialView"
import { EditableInlineField } from "@/components/editor/EditableInlineField"
import { ContextToolbar } from "@/components/editor/ContextToolbar"
import EnrollButton from "@/components/courses/EnrollButton"
import { CourseDocumentTabs, TabSelection } from "@/components/courses/CourseDocumentTabs"
import { CourseTeachersSection } from "@/components/course/CourseTeachersSection"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import ScheduleDemoModal from "@/components/course/ScheduleDemoModal"
import { updateCourseInline } from "@/lib/actions/admin/courses"
import {
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    duplicateChapter
} from "@/lib/actions/admin/chapters"
import {
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    duplicateLesson
} from "@/lib/actions/admin/lessons"
import {
    CourseCustomMetadata,
    DEFAULT_FEATURES,
    DEFAULT_FEATURES_TITLE,
    DEFAULT_SKILLS,
    DEFAULT_SKILLS_TITLE,
    DEFAULT_PROJECT_COUNT,
} from "@/types/course-metadata"
import {
    updateCourseMetadataAction,
    addCourseFeatureAction,
    updateCourseFeatureAction,
    deleteCourseFeatureAction,
    addCourseSkillAction,
    updateCourseSkillAction,
    deleteCourseSkillAction,
} from "@/lib/actions/admin/course-metadata"
import { toast } from "sonner"

function getFeatureIcon(text: string, index: number) {
    const lower = text.toLowerCase()
    if (lower.includes("ai") || lower.includes("assist") || lower.includes("gpt") || lower.includes("gemini")) {
        return <Sparkles className="h-4 w-4 text-[#3A10E5] flex-shrink-0" />
    }
    if (lower.includes("project") || lower.includes("build") || lower.includes("portfolio")) {
        return <Puzzle className="h-4 w-4 text-[#10162F] flex-shrink-0" />
    }
    if (lower.includes("quiz") || lower.includes("test") || lower.includes("exam") || lower.includes("assessment")) {
        return <CheckSquare className="h-4 w-4 text-[#10162F] flex-shrink-0" />
    }
    if (lower.includes("certificate") || lower.includes("completion") || lower.includes("degree")) {
        return <GraduationCap className="h-4 w-4 text-[#10162F] flex-shrink-0" />
    }
    if (lower.includes("video") || lower.includes("stream") || lower.includes("lecture")) {
        return <PlayCircle className="h-4 w-4 text-[#10162F] flex-shrink-0" />
    }
    const fallbackIcons = [
        <Sparkles key="1" className="h-4 w-4 text-[#3A10E5] flex-shrink-0" />,
        <Puzzle key="2" className="h-4 w-4 text-[#10162F] flex-shrink-0" />,
        <CheckSquare key="3" className="h-4 w-4 text-[#10162F] flex-shrink-0" />,
        <GraduationCap key="4" className="h-4 w-4 text-[#10162F] flex-shrink-0" />,
    ]
    return fallbackIcons[index % fallbackIcons.length]
}

function extractHeadingsFromContent(content: string): string[] {
    if (!content) return []
    const headings: string[] = []
    const mdMatches = content.match(/^#{1,3}\s+(.+)$/gm)
    if (mdMatches) {
        mdMatches.forEach((m) => headings.push(m.replace(/^#{1,3}\s+/, "").trim()))
    }
    const htmlMatches = content.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi)
    if (htmlMatches) {
        htmlMatches.forEach((m) => headings.push(m.replace(/<\/?h[1-3][^>]*>/gi, "").trim()))
    }
    return Array.from(new Set(headings)).slice(0, 8)
}

interface CourseDetailViewProps {
    initialCourse: any
    initialMetadata?: CourseCustomMetadata
    isEnrolled: boolean
    hasAccess: boolean
    progress: number
    isEditor?: boolean
}

export function CourseDetailView({
    initialCourse,
    initialMetadata,
    isEnrolled,
    hasAccess,
    progress,
    isEditor = false,
}: CourseDetailViewProps) {
    const router = useRouter()
    const [course, setCourse] = useState(initialCourse)
    const [chapters, setChapters] = useState<any[]>(initialCourse.chapters || [])
    const [activeTab, setActiveTab] = useState<any>({ type: "overview", mode: "view" })
    const [isTabsCollapsed, setIsTabsCollapsed] = useState<boolean>(false)

    const { data: session } = useSession()
    const { openMobileAuth } = useMobileAuth()
    const [isScheduleDemoOpen, setIsScheduleDemoOpen] = useState(false)
    const [studentDemoBooking, setStudentDemoBooking] = useState<any>(null)

    useEffect(() => {
        if (session?.user) {
            fetch(`/api/courses/demo/book?slug=${encodeURIComponent(initialCourse.slug)}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.booked && data.slotId) {
                        setStudentDemoBooking(data)
                    }
                })
                .catch(() => {})
        }
    }, [session, initialCourse.slug])

    const demoSettings = useMemo(() => {
        try {
            if (initialCourse.metadataJson) {
                const parsed = JSON.parse(initialCourse.metadataJson)
                return parsed.demoSettings || null
            }
        } catch {}
        return null
    }, [initialCourse.metadataJson])
    const isProgrammaticScroll = useRef(false)
    const programmaticScrollTimer = useRef<NodeJS.Timeout | null>(null)

    const scrollToSection = (elementId: string) => {
        isProgrammaticScroll.current = true
        if (programmaticScrollTimer.current) {
            clearTimeout(programmaticScrollTimer.current)
        }

        const tryScroll = () => {
            const el = document.getElementById(elementId)
            if (el) {
                // Fixed TopNav (60px) + Sticky Workspace bar (48px) = 108px.
                // 118px gives an ideal breathing room above the header.
                const headerOffset = 118
                const elementPosition = el.getBoundingClientRect().top
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                window.scrollTo({
                    top: Math.max(0, offsetPosition),
                    behavior: "smooth",
                })
                return true
            }
            return false
        }

        if (!tryScroll()) {
            setTimeout(tryScroll, 50)
            setTimeout(tryScroll, 150)
        }

        // Keep programmatic scroll flag active while browser smooth scrolls across the document
        programmaticScrollTimer.current = setTimeout(() => {
            isProgrammaticScroll.current = false
        }, 1200)
    }

    const activeTabRef = useRef(activeTab)
    activeTabRef.current = activeTab

    // ScrollSpy to keep left sidebar active tab in sync with natural page scrolling
    useEffect(() => {
        if (activeTab.mode === "edit" || activeTab.type === "new_chapter") return

        let ticking = false

        const handleScroll = () => {
            if (isProgrammaticScroll.current) return
            if (activeTabRef.current.mode === "edit" || activeTabRef.current.type === "new_chapter") return

            if (!ticking) {
                requestAnimationFrame(() => {
                    ticking = false

                    // If user is at top of page (hero area / overview), activeTab is overview
                    if (window.scrollY < 260) {
                        setActiveTab((prev: any) => (prev.type === "overview" ? prev : { type: "overview" }))
                        return
                    }

                    // Check if scrolled near the bottom of document
                    const isNearBottom =
                        window.innerHeight + window.scrollY >=
                        document.documentElement.scrollHeight - 70

                    const targets: {
                        tab: TabSelection
                        top: number
                    }[] = []

                    chapters.forEach((ch) => {
                        const chEl = document.getElementById(`chapter-${ch.id}`)
                        if (chEl) {
                            targets.push({
                                tab: { type: "chapter", chapterId: ch.id, mode: "view" },
                                top: chEl.getBoundingClientRect().top,
                            })
                        }
                        ch.lessons?.forEach((l: any) => {
                            const lEl = document.getElementById(`lesson-${l.id}`)
                            if (lEl) {
                                targets.push({
                                    tab: { type: "lesson", chapterId: ch.id, lessonId: l.id, mode: "view" },
                                    top: lEl.getBoundingClientRect().top,
                                })
                            }
                        })
                    })

                    if (targets.length === 0) return

                    let current: { tab: TabSelection; top: number } | undefined

                    if (isNearBottom) {
                        current = targets[targets.length - 1]
                    } else {
                        // Elements that have reached or passed the reading focal line (180px from top)
                        const passed = targets.filter((t) => t.top <= 180)
                        if (passed.length > 0) {
                            current = passed[passed.length - 1]
                        } else {
                            current = { tab: { type: "overview" }, top: 0 }
                        }
                    }

                    if (current) {
                        setActiveTab((prev: any) => {
                            if (
                                prev.type === current!.tab.type &&
                                prev.chapterId === current!.tab.chapterId &&
                                prev.lessonId === current!.tab.lessonId
                            ) {
                                return prev
                            }
                            return current!.tab
                        })
                    }
                })
                ticking = true
            }
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        document.addEventListener("scroll", handleScroll, { passive: true })

        // Initial check on mount
        handleScroll()

        return () => {
            window.removeEventListener("scroll", handleScroll)
            document.removeEventListener("scroll", handleScroll)
            if (programmaticScrollTimer.current) {
                clearTimeout(programmaticScrollTimer.current)
            }
        }
    }, [chapters, activeTab.mode, activeTab.type])

    // Course Inclusions, Projects, and Skills Metadata State
    const [metadata, setMetadata] = useState<CourseCustomMetadata>(
        initialMetadata || {
            courseId: initialCourse.id,
            featuresTitle: DEFAULT_FEATURES_TITLE,
            features: [...DEFAULT_FEATURES],
            projectCount: DEFAULT_PROJECT_COUNT,
            skillsTitle: DEFAULT_SKILLS_TITLE,
            skills: [...DEFAULT_SKILLS],
        }
    )

    // Feature item editing states
    const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null)
    const [editingFeatureText, setEditingFeatureText] = useState("")
    const [isAddingFeature, setIsAddingFeature] = useState(false)
    const [newFeatureText, setNewFeatureText] = useState("")

    // Skill item editing states
    const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null)
    const [editingSkillText, setEditingSkillText] = useState("")
    const [isAddingSkill, setIsAddingSkill] = useState(false)
    const [newSkillText, setNewSkillText] = useState("")

    // Course Overview editing state
    const [editingOverviewDescription, setEditingOverviewDescription] = useState(false)

    // Chapter & Lesson inline editing states
    const [creatingChapter, setCreatingChapter] = useState(false)
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
    const [creatingLessonChapterId, setCreatingLessonChapterId] = useState<string | null>(null)
    const [creatingLessonPreset, setCreatingLessonPreset] = useState<{
        type?: any
        title?: string
    } | null>(null)
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Inline field updates for course
    const handleUpdateCourseField = async (field: string, value: any) => {
        try {
            await updateCourseInline(course.id, { [field]: value })
            setCourse((prev: any) => ({ ...prev, [field]: value }))
            toast.success(`Course ${field} updated!`)
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || `Failed to update ${field}`)
        }
    }

    // Custom metadata field updates (projects, inclusions title, skills title)
    const handleUpdateMetadataField = async (field: keyof CourseCustomMetadata, value: any) => {
        try {
            setMetadata((prev) => ({ ...prev, [field]: value }))
            await updateCourseMetadataAction(course.id, { [field]: value })
            toast.success(`Course ${String(field)} updated!`)
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || `Failed to update ${String(field)}`)
        }
    }

    // Inclusions (Features) item actions
    const handleSaveFeature = async (index: number) => {
        const trimmed = editingFeatureText.trim()
        if (!trimmed) {
            toast.error("Inclusion item cannot be empty")
            return
        }
        try {
            const res = await updateCourseFeatureAction(course.id, index, trimmed)
            setMetadata(res.metadata)
            setEditingFeatureIndex(null)
            toast.success("Inclusion item updated!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to update item")
        }
    }

    const handleAddFeature = async () => {
        const trimmed = newFeatureText.trim()
        if (!trimmed) {
            toast.error("Inclusion item cannot be empty")
            return
        }
        try {
            const res = await addCourseFeatureAction(course.id, trimmed)
            setMetadata(res.metadata)
            setIsAddingFeature(false)
            setNewFeatureText("")
            toast.success("Inclusion item added!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to add item")
        }
    }

    const handleDeleteFeature = async (index: number) => {
        try {
            const res = await deleteCourseFeatureAction(course.id, index)
            setMetadata(res.metadata)
            toast.success("Inclusion item removed.")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to delete item")
        }
    }

    // Acquired Skills item actions
    const handleSaveSkill = async (index: number) => {
        const trimmed = editingSkillText.trim()
        if (!trimmed) {
            toast.error("Skill cannot be empty")
            return
        }
        try {
            const res = await updateCourseSkillAction(course.id, index, trimmed)
            setMetadata(res.metadata)
            setEditingSkillIndex(null)
            toast.success("Skill updated!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to update skill")
        }
    }

    const handleAddSkill = async () => {
        const trimmed = newSkillText.trim()
        if (!trimmed) {
            toast.error("Skill cannot be empty")
            return
        }
        try {
            const res = await addCourseSkillAction(course.id, trimmed)
            setMetadata(res.metadata)
            setIsAddingSkill(false)
            setNewSkillText("")
            toast.success("Skill added!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to add skill")
        }
    }

    const handleDeleteSkill = async (index: number) => {
        try {
            const res = await deleteCourseSkillAction(course.id, index)
            setMetadata(res.metadata)
            toast.success("Skill removed.")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to delete skill")
        }
    }

    // Save Course Description & Metadata via UniversalEditor
    const handleSaveCourseDescription = async (data: any, status?: "DRAFT" | "PUBLISHED") => {
        try {
            await updateCourseInline(course.id, {
                title: data.title || course.title,
                description: data.description,
                difficulty: data.difficulty,
                duration: data.duration,
                prerequisites: data.prerequisites,
                status: status || course.status,
            })
            setCourse((prev: any) => ({
                ...prev,
                title: data.title || prev.title,
                description: data.description,
                difficulty: data.difficulty || prev.difficulty,
                duration: data.duration !== undefined ? data.duration : prev.duration,
                prerequisites: data.prerequisites || prev.prerequisites,
                status: status || prev.status,
            }))

            if (
                data.projectCount !== undefined ||
                data.featuresTitle !== undefined ||
                data.features !== undefined ||
                data.skillsTitle !== undefined ||
                data.skills !== undefined
            ) {
                const metaUpdates: any = {}
                if (data.projectCount !== undefined) metaUpdates.projectCount = Number(data.projectCount)
                if (data.featuresTitle !== undefined) metaUpdates.featuresTitle = data.featuresTitle
                if (data.features !== undefined) metaUpdates.features = data.features
                if (data.skillsTitle !== undefined) metaUpdates.skillsTitle = data.skillsTitle
                if (data.skills !== undefined) metaUpdates.skills = data.skills
                const res = await updateCourseMetadataAction(course.id, metaUpdates)
                setMetadata(res.metadata)
            }

            setEditingOverviewDescription(false)
            toast.success("Course overview updated!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to update course overview")
            throw err
        }
    }

    // Create Chapter
    const handleCreateChapter = async (data: any) => {
        try {
            const newChapter = await createChapter(course.id, {
                title: data.title || "Untitled Chapter",
                description: data.description || "",
            })
            const formatted = { ...newChapter, lessons: [] }
            setChapters((prev) => [...prev, formatted])
            setCreatingChapter(false)
            toast.success("Chapter added successfully!")
            router.refresh()
            return formatted
        } catch (err: any) {
            toast.error(err.message || "Failed to add chapter")
            throw err
        }
    }

    // Update Chapter
    const handleUpdateChapter = async (chapterId: string, data: any) => {
        try {
            const updated = await updateChapter(chapterId, {
                title: data.title,
                description: data.description,
            })
            setChapters((prev) =>
                prev.map((ch) => (ch.id === chapterId ? { ...ch, ...updated } : ch))
            )
            setEditingChapterId(null)
            toast.success("Chapter updated!")
            router.refresh()
            return updated
        } catch (err: any) {
            toast.error(err.message || "Failed to update chapter")
            throw err
        }
    }

    // Delete Chapter
    const handleDeleteChapter = async (chapterId: string) => {
        if (!confirm("Are you sure you want to delete this chapter and all its lessons?")) {
            return
        }
        try {
            await deleteChapter(chapterId)
            setChapters((prev) => prev.filter((ch) => ch.id !== chapterId))
            setEditingChapterId(null)
            if (activeTab.type === "chapter" && activeTab.chapterId === chapterId) {
                setActiveTab({ type: "overview" })
            }
            toast.success("Chapter deleted.")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to delete chapter")
        }
    }

    // Reorder Chapters
    const handleMoveChapter = async (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= chapters.length) return

        const newChapters = [...chapters]
        const temp = newChapters[index]
        newChapters[index] = newChapters[targetIndex]
        newChapters[targetIndex] = temp

        setChapters(newChapters)
        try {
            await reorderChapters(
                course.id,
                newChapters.map((c) => c.id)
            )
            toast.success("Curriculum reordered!")
        } catch (err: any) {
            toast.error("Failed to persist reordering.")
        }
    }

    // Duplicate Chapter
    const handleDuplicateChapter = async (chapterId: string) => {
        try {
            const duplicated = await duplicateChapter(chapterId)
            setChapters((prev) => [...prev, duplicated])
            toast.success("Chapter duplicated successfully!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to duplicate chapter")
        }
    }

    // Create Lesson inside chapter
    const handleCreateLesson = async (chapterId: string, data: any) => {
        try {
            const newLesson = await createLesson(chapterId, {
                title: data.title || "Untitled Lesson",
                type: data.type || "READING",
                content: data.content,
                videoUrl: data.videoUrl,
                duration: data.duration ? Number(data.duration) : undefined,
                xpReward: data.xpReward ? Number(data.xpReward) : 10,
            })

            setChapters((prev) =>
                prev.map((ch) =>
                    ch.id === chapterId
                        ? { ...ch, lessons: [...(ch.lessons || []), newLesson] }
                        : ch
                )
            )
            setCreatingLessonChapterId(null)
            toast.success("Lesson created!")
            router.refresh()
            return newLesson
        } catch (err: any) {
            toast.error(err.message || "Failed to create lesson")
            throw err
        }
    }

    // Duplicate Lesson
    const handleDuplicateLesson = async (chapterId: string, lessonId: string) => {
        try {
            const duplicated = await duplicateLesson(lessonId)
            setChapters((prev) =>
                prev.map((ch) =>
                    ch.id === chapterId
                        ? { ...ch, lessons: [...(ch.lessons || []), duplicated] }
                        : ch
                )
            )
            toast.success("Lesson duplicated successfully!")
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to duplicate lesson")
        }
    }

    // Move Lesson within chapter
    const handleMoveLesson = async (
        chapterId: string,
        lessonIndex: number,
        direction: "up" | "down"
    ) => {
        const chapter = chapters.find((ch) => ch.id === chapterId)
        if (!chapter || !chapter.lessons) return

        const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1
        if (targetIndex < 0 || targetIndex >= chapter.lessons.length) return

        const newLessons = [...chapter.lessons]
        const temp = newLessons[lessonIndex]
        newLessons[lessonIndex] = newLessons[targetIndex]
        newLessons[targetIndex] = temp

        setChapters((prev) =>
            prev.map((ch) => (ch.id === chapterId ? { ...ch, lessons: newLessons } : ch))
        )

        try {
            await reorderLessons(
                chapterId,
                newLessons.map((l: any) => l.id)
            )
            toast.success("Lesson reordered!")
        } catch (err: any) {
            toast.error("Failed to persist lesson reorder.")
            router.refresh()
        }
    }

    // Delete Lesson
    const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
        if (!confirm("Delete this lesson?")) return
        try {
            await deleteLesson(lessonId)
            setChapters((prev) =>
                prev.map((ch) =>
                    ch.id === chapterId
                        ? { ...ch, lessons: ch.lessons.filter((l: any) => l.id !== lessonId) }
                        : ch
                )
            )
            if (activeTab.type === "lesson" && activeTab.lessonId === lessonId) {
                setActiveTab({ type: "chapter", chapterId, mode: "view" })
            }
            toast.success("Lesson deleted.")
            router.refresh()
        } catch (err: any) {
            toast.error("Failed to delete lesson")
        }
    }

    const courseTheme = useMemo(() => {
        if (course.theme) {
            if (typeof course.theme === "string") {
                try {
                    return JSON.parse(course.theme)
                } catch {
                    return null
                }
            }
            return course.theme
        }
        if (course.metadataJson) {
            try {
                const parsed = JSON.parse(course.metadataJson)
                return parsed.theme || null
            } catch {
                return null
            }
        }
        return null
    }, [course.theme, course.metadataJson])

    const themeStyles = useMemo(() => {
        if (!courseTheme?.colors && !courseTheme?.fonts) return undefined
        const styleObj: Record<string, string> = {}
        if (courseTheme.colors) {
            Object.entries(courseTheme.colors).forEach(([k, v]) => {
                if (v) {
                    styleObj[`--tutorial-${k}`] = v as string
                    styleObj[`--rz-${k}`] = v as string
                }
            })
        }
        if (courseTheme.fonts) {
            Object.entries(courseTheme.fonts).forEach(([k, v]) => {
                if (v && /^[\w\s-]+$/.test(v as string)) {
                    styleObj[`--tutorial-font-${k}`] = `'${v}', ${k === "mono" ? "ui-monospace, monospace" : "system-ui, sans-serif"}`
                }
            })
        }
        return styleObj
    }, [courseTheme])

    useEffect(() => {
        if (!courseTheme?.fonts) return
        const fontNames = Object.values(courseTheme.fonts)
            .filter((f): f is string => Boolean(f && typeof f === "string" && /^[\w\s-]+$/.test(f as string)))
            .map((f) => (f as string).trim())
            .filter(
                (f) =>
                    !["system-ui", "sans-serif", "serif", "monospace", "ui-monospace", "inherit", "initial"].includes(
                        f.toLowerCase()
                    )
            )

        if (fontNames.length === 0) return

        const uniqueFonts = Array.from(new Set(fontNames))
        const familiesParam = uniqueFonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800;900`).join("&")
        const href = `https://fonts.googleapis.com/css2?${familiesParam}&display=swap`

        const linkId = "rosera-google-fonts"
        let linkEl = document.getElementById(linkId) as HTMLLinkElement | null
        if (!linkEl) {
            linkEl = document.createElement("link")
            linkEl.id = linkId
            linkEl.rel = "stylesheet"
            document.head.appendChild(linkEl)
        }
        linkEl.href = href
    }, [courseTheme?.fonts])

    // Metrics calculations
    const totalLessons = chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0)
    const totalDurationMinutes = chapters.reduce(
        (sum, ch) => sum + (ch.lessons?.reduce((s: number, l: any) => s + (l.duration || 0), 0) || 0),
        0
    )
    const calculatedHours =
        course.duration && course.duration > 0
            ? Math.round(course.duration / 60)
            : totalDurationMinutes > 0
            ? Math.round(totalDurationMinutes / 60)
            : 0
    const ratingCount = course.rating && course.rating > 0
        ? (course.reviews?.length || 0)
        : 0

    // Helper: Trigger creation of a new chapter and open Delhi Post Editor immediately (Requirement 2b)
    const handleOpenNewChapterWithEditor = () => {
        setActiveTab({ type: "new_chapter", mode: "edit" })
    }

    // Render Canvas Content based on activeTab
    const renderCanvasContent = () => {
        // -------------------------------------------------------------
        // CASE 1: NEW CHAPTER CREATION (Requirement 2b)
        // Immediately opens Delhi Post Editor for teacher
        // -------------------------------------------------------------
        if (activeTab.type === "new_chapter") {
            return (
                <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#10162F]">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <button
                                type="button"
                                onClick={() => setActiveTab({ type: "overview" })}
                                className="hover:text-[#3A10E5] hover:underline flex items-center gap-1 text-xs font-bold"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>{course.title}</span>
                            </button>
                            <span>/</span>
                            <span className="text-[#10162F] font-extrabold">New Chapter</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#3A10E5] text-white border-2 border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F]">
                                🌹 Rosera Editor
                            </span>
                        </div>
                    </div>

                    <UniversalEditor
                        mode="create"
                        entityType="chapter"
                        parentId={course.id}
                        initialData={{
                            title: "",
                            description: "",
                        }}
                        breadcrumb={[course.title, "New Chapter", "Rosera Editor"]}
                        onSave={async (data) => {
                            const newCh = await handleCreateChapter(data)
                            setActiveTab({ type: "chapter", chapterId: newCh.id, mode: "view" })
                        }}
                        onCancel={() => setActiveTab({ type: "overview" })}
                    />
                </div>
            )
        }

        // -------------------------------------------------------------
        // CASE 2: CHAPTER EDIT MODE
        // -------------------------------------------------------------
        if (activeTab.type === "chapter" && activeTab.chapterId && activeTab.mode === "edit") {
            const currentChapter = chapters.find((ch) => ch.id === activeTab.chapterId)
            if (currentChapter) {
                return (
                    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#10162F]">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab({ type: "chapter", chapterId: currentChapter.id, mode: "view" })
                                        setTimeout(() => scrollToSection("chapter-" + currentChapter.id), 100)
                                    }}
                                    className="hover:text-[#3A10E5] hover:underline flex items-center gap-1"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    <span>Back to Reading</span>
                                </button>
                                <span>/</span>
                                <span className="text-[#10162F] font-extrabold">{currentChapter.title}</span>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#3A10E5] text-white border-2 border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F]">
                                🌹 Rosera Editor
                            </span>
                        </div>

                        <UniversalEditor
                            mode="edit"
                            entityType="chapter"
                            entityId={currentChapter.id}
                            parentId={course.id}
                            initialData={{
                                title: currentChapter.title,
                                description: currentChapter.description || "",
                            }}
                            permissions={{ canEdit: true, canPublish: true, canDelete: true }}
                            breadcrumb={[course.title, currentChapter.title, "Rosera Editor"]}
                            onSave={async (data) => {
                                await handleUpdateChapter(currentChapter.id, data)
                                setActiveTab({ type: "chapter", chapterId: currentChapter.id, mode: "view" })
                                setTimeout(() => scrollToSection("chapter-" + currentChapter.id), 100)
                            }}
                            onCancel={() => {
                                setActiveTab({ type: "chapter", chapterId: currentChapter.id, mode: "view" })
                                setTimeout(() => scrollToSection("chapter-" + currentChapter.id), 100)
                            }}
                            onDelete={async () => {
                                await handleDeleteChapter(currentChapter.id)
                                setActiveTab({ type: "overview" })
                            }}
                        />
                    </div>
                )
            }
        }

        // -------------------------------------------------------------
        // CASE 3: LESSON / SUBTOPIC EDIT MODE
        // -------------------------------------------------------------
        if (activeTab.type === "lesson" && activeTab.chapterId && activeTab.lessonId && activeTab.mode === "edit") {
            const currentChapter = chapters.find((ch) => ch.id === activeTab.chapterId)
            const currentLesson = currentChapter?.lessons?.find((l: any) => l.id === activeTab.lessonId)
            if (currentChapter && currentLesson) {
                return (
                    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#10162F]">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab({
                                            type: "lesson",
                                            chapterId: currentChapter.id,
                                            lessonId: currentLesson.id,
                                            mode: "view",
                                        })
                                        setTimeout(() => scrollToSection("lesson-" + currentLesson.id), 100)
                                    }}
                                    className="hover:text-[#3A10E5] hover:underline flex items-center gap-1"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    <span>Back to Reading</span>
                                </button>
                                <span>/</span>
                                <span className="text-[#10162F] font-extrabold truncate max-w-xs">{currentLesson.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#3A10E5] text-white border-2 border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F]">
                                    🌹 Rosera Editor
                                </span>
                            </div>
                        </div>

                        <RoseraEditor
                            lessonId={currentLesson.id}
                            chapterId={currentChapter.id}
                            title={currentLesson.title}
                            initialContent={currentLesson.content || ""}
                            breadcrumb={[course.title, currentChapter.title, currentLesson.title, "Rosera Editor"]}
                            onSave={async (newContent) => {
                                const updated = await updateLesson(currentLesson.id, {
                                    content: newContent,
                                })
                                setChapters((prev) =>
                                    prev.map((ch) =>
                                        ch.id === currentChapter.id
                                            ? {
                                                  ...ch,
                                                  lessons: ch.lessons.map((l: any) =>
                                                      l.id === currentLesson.id ? { ...l, content: newContent } : l
                                                  ),
                                              }
                                            : ch
                                    )
                                )
                                setActiveTab({
                                    type: "lesson",
                                    chapterId: currentChapter.id,
                                    lessonId: currentLesson.id,
                                    mode: "view",
                                })
                                toast.success("Subtopic updated in Rosera Editor!")
                                setTimeout(() => scrollToSection("lesson-" + currentLesson.id), 100)
                            }}
                            onCancel={() => {
                                setActiveTab({
                                    type: "lesson",
                                    chapterId: currentChapter.id,
                                    lessonId: currentLesson.id,
                                    mode: "view",
                                })
                                setTimeout(() => scrollToSection("lesson-" + currentLesson.id), 100)
                            }}
                        />
                    </div>
                )
            }
        }

        // -------------------------------------------------------------
        // DEFAULT CASE: COURSE OVERVIEW (Requirement 2a)
        // Full Course Overview: Hero, Inclusions, Stats, About, Skills, Syllabus
        // -------------------------------------------------------------
        return (
            <div id="overview" className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200 scroll-mt-28" style={themeStyles as any}>
                {/* Top Codecademy Hero Area */}
                <div className="pt-2 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Course Main Info */}
                        <div className="lg:col-span-7 space-y-4">
                            {/* Free / Premium Badge & Editor Tag */}
                            <div className="flex items-center gap-2">
                                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-[color:var(--tutorial-ink,#1f2a6b)] text-white">
                                    {course.isPremium ? "Pro" : "Free"}
                                </span>
                                <span className="font-extrabold text-xs uppercase tracking-wider text-[color:var(--tutorial-ink,#1f2a6b)]">
                                    Course
                                </span>
                                {isEditor && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[color:var(--tutorial-primary,#3A10E5)] text-white border border-[color:var(--tutorial-ink,#1f2a6b)]">
                                        🌹 Rosera Editor Active
                                    </span>
                                )}
                            </div>

                            {/* Bold Main Headline (Editable) */}
                            <h1 className="text-3xl sm:text-5xl font-extrabold text-[color:var(--tutorial-ink,#1f2a6b)] tracking-tight leading-tight">
                                <EditableInlineField
                                    value={course.title}
                                    isEditor={isEditor}
                                    label="Course Title"
                                    onSave={(newTitle) => handleUpdateCourseField("title", newTitle)}
                                    displayClassName="text-3xl sm:text-5xl font-extrabold text-[color:var(--tutorial-ink,#1f2a6b)] tracking-tight leading-tight"
                                />
                            </h1>

                            {/* Subtitle / Description snippet with safe inline highlights */}
                            <p
                                className="text-base sm:text-lg text-gray-700 leading-relaxed font-normal"
                                dangerouslySetInnerHTML={{
                                    __html: inlineFmt(cleanDescriptionSnippet(course.description, 280)),
                                }}
                            />

                            {/* Ratings Row (hidden on student-facing per UX Pass 6 F) */}
                            {isEditor && course.rating && course.rating > 0 ? (
                                <div className="flex items-center gap-2 text-sm pt-1">
                                    <span className="font-black text-base text-[color:var(--tutorial-ink,#1f2a6b)]">
                                        {course.rating.toFixed(1)}
                                    </span>
                                    <div className="flex items-center text-amber-400">
                                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        <Star className="h-4 w-4 fill-amber-200 text-amber-400" />
                                    </div>
                                    {ratingCount > 0 && (
                                        <span className="text-xs font-semibold text-gray-600 underline cursor-pointer">
                                            {ratingCount.toLocaleString()} ratings
                                        </span>
                                    )}
                                </div>
                            ) : null}

                            {/* CTA and Learners Row */}
                            <div className="flex flex-wrap items-center gap-6 pt-4">
                                {isEnrolled || hasAccess ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const firstChapter = chapters[0]
                                            if (firstChapter) {
                                                const targetId = firstChapter.lessons?.[0]?.id
                                                    ? `lesson-${firstChapter.lessons[0].id}`
                                                    : `chapter-${firstChapter.id}`
                                                const el = document.getElementById(targetId)
                                                if (el) el.scrollIntoView({ behavior: "smooth" })
                                            }
                                        }}
                                        className="px-8 py-3.5 rounded-lg bg-[color:var(--tutorial-primary,#3A10E5)] hover:brightness-95 text-white font-extrabold text-sm sm:text-base border-2 border-[color:var(--tutorial-ink,#1f2a6b)] shadow-[3px_3px_0px_0px_var(--tutorial-ink,#1f2a6b)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                        <PlayCircle className="h-5 w-5" />
                                        <span>{isTutorialCourse ? "Start Reading Tutorial" : "Watch Now"}</span>
                                    </button>
                                ) : (
                                    <>
                                        <EnrollButton
                                            courseId={course.id}
                                            isPremium={course.isPremium}
                                            courseSlug={course.slug}
                                            courseTitle={course.title}
                                            isEnrolled={isEnrolled}
                                        />
                                        {studentDemoBooking ? (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 shadow-xs">
                                                <div className="text-left">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                                                            Your Upcoming Demo
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            studentDemoBooking.slotStatus === "LIVE"
                                                                ? "bg-red-500 text-white animate-pulse"
                                                                : "bg-emerald-100 text-emerald-800"
                                                        }`}>
                                                            {studentDemoBooking.slotStatus === "LIVE" ? "LIVE NOW" : "REGISTERED"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                                        {studentDemoBooking.fullTimeLabel || `${studentDemoBooking.slotDate} at ${studentDemoBooking.slotTime}`}
                                                    </span>
                                                </div>
                                                {studentDemoBooking.slotStatus === "LIVE" ? (
                                                    <Link
                                                        href={`/courses/${course.slug}/demo?slot=${studentDemoBooking.slotId}`}
                                                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs animate-pulse"
                                                    >
                                                        <Video className="w-3.5 h-3.5" />
                                                        <span>🔴 Enter Demo Room</span>
                                                    </Link>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-400 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed border border-gray-300 dark:border-gray-700"
                                                    >
                                                        <Video className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>Starts {studentDemoBooking.slotTime || "Scheduled"}</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : demoSettings?.enabled === true && (
                                            <button
                                                type="button"
                                                onClick={() => setIsScheduleDemoOpen(true)}
                                                className="px-6 py-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm sm:text-base border-2 border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-[3px_3px_0px_0px_#059669] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                <span>Free Demo Class</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Column: "This course includes" Hatched Brutalist Card */}
                        <div className="lg:col-span-5">
                            <div className="relative">
                                <div
                                    className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border-2 border-[#10162F] dark:border-gray-600 pointer-events-none hidden sm:block"
                                    style={{
                                        backgroundImage:
                                            "repeating-linear-gradient(45deg, currentColor 0, currentColor 1.5px, transparent 0, transparent 6px)",
                                    }}
                                />

                                <div className="relative bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 p-5 sm:p-6 shadow-xs">
                                    <div className="flex items-center justify-between mb-4">
                                        <EditableInlineField
                                            value={metadata.featuresTitle || "This course includes"}
                                            type="text"
                                            isEditor={isEditor}
                                            label="Inclusions Section Title"
                                            displayClassName="font-extrabold text-base text-[#10162F] dark:text-white"
                                            onSave={async (newTitle) => {
                                                await handleUpdateMetadataField("featuresTitle", newTitle)
                                            }}
                                        />
                                    </div>

                                    <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
                                        {metadata.features.map((feature, index) => (
                                            <div
                                                key={index}
                                                className="group/item py-3 flex items-start justify-between gap-3"
                                            >
                                                {editingFeatureIndex === index ? (
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editingFeatureText}
                                                            onChange={(e) => setEditingFeatureText(e.target.value)}
                                                            className="flex-1 px-2.5 py-1.5 border-2 border-[#10162F] rounded-lg text-xs font-bold text-[#10162F] focus:outline-none"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveFeature(index)
                                                                if (e.key === "Escape") setEditingFeatureIndex(null)
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveFeature(index)}
                                                            className="px-2.5 py-1 bg-[#10162F] text-white rounded-lg text-xs font-bold"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingFeatureIndex(null)}
                                                            className="px-2 py-1 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            {getFeatureIcon(feature, index)}
                                                            <span className="leading-snug">{feature}</span>
                                                        </div>

                                                        {isEditor && (
                                                            <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingFeatureIndex(index)
                                                                        setEditingFeatureText(feature)
                                                                    }}
                                                                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-[#3A10E5]"
                                                                    title="Edit item"
                                                                >
                                                                    <Edit3 className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteFeature(index)}
                                                                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                                                                    title="Delete item"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Feature Button */}
                                    {isEditor && (
                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            {isAddingFeature ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={newFeatureText}
                                                        onChange={(e) => setNewFeatureText(e.target.value)}
                                                        placeholder="e.g. 14 Practical projects with reviews"
                                                        className="flex-1 px-2.5 py-1.5 border-2 border-[#10162F] rounded-lg text-xs font-bold text-[#10162F] focus:outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleAddFeature()
                                                            if (e.key === "Escape") setIsAddingFeature(false)
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddFeature}
                                                        className="px-2.5 py-1.5 bg-[#3A10E5] text-white rounded-lg text-xs font-bold border border-[#10162F]"
                                                    >
                                                        Add
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingFeature(false)}
                                                        className="px-2 py-1.5 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsAddingFeature(true)
                                                        setNewFeatureText("")
                                                    }}
                                                    className="w-full py-2 border border-dashed border-[#10162F]/40 hover:border-[#3A10E5] hover:bg-[#3A10E5]/5 rounded-xl text-xs font-bold text-[#3A10E5] flex items-center justify-center gap-1.5 transition-all"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>+ Add Included Feature</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Banner: Brutalist 4-Stat Row */}
                    {((course.difficulty) || (calculatedHours > 0) || (metadata.projectCount && metadata.projectCount > 0) || (course.prerequisites?.length > 0) || isEditor) && (
                        <div className="mt-8 bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-[color:var(--tutorial-ink,#1f2a6b)] dark:border-gray-700 shadow-[4px_4px_0px_0px_var(--tutorial-ink,#1f2a6b)] dark:shadow-[4px_4px_0px_0px_#374151] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {/* Stat 1: Skill level */}
                            {(course.difficulty || isEditor) && (
                                <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-lg bg-[#3A10E5]/10 flex items-center justify-center flex-shrink-0 text-[#3A10E5]">
                                        <BarChart2 className="h-5 w-5 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            Skill level
                                        </div>
                                        <div className="text-sm sm:text-base font-extrabold text-[color:var(--tutorial-ink,#1f2a6b)] dark:text-white capitalize">
                                            <EditableInlineField
                                                value={course.difficulty || (isEditor ? "BEGINNER" : "")}
                                                type="select"
                                                options={[
                                                    { label: "Beginner", value: "BEGINNER" },
                                                    { label: "Intermediate", value: "INTERMEDIATE" },
                                                    { label: "Advanced", value: "ADVANCED" },
                                                ]}
                                                isEditor={isEditor}
                                                label="Skill Level"
                                                onSave={(val) => handleUpdateCourseField("difficulty", val)}
                                                renderDisplay={(val) => (
                                                    <span className="capitalize">{String(val).toLowerCase()}</span>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stat 2: Time to complete */}
                            {(calculatedHours > 0 || isEditor) && (
                                <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-600">
                                        <Clock className="h-5 w-5 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                            Time to complete
                                        </div>
                                        <div className="text-sm sm:text-base font-extrabold text-[color:var(--tutorial-ink,#1f2a6b)] dark:text-white">
                                            <EditableInlineField
                                                value={calculatedHours}
                                                type="number"
                                                isEditor={isEditor}
                                                label="Duration"
                                                onSave={(val) => handleUpdateCourseField("duration", Number(val) * 60)}
                                                renderDisplay={(val) => <span>{val} hours</span>}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stat 3: Projects */}
                            {((metadata.projectCount && metadata.projectCount > 0) || isEditor) && (
                                <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-600">
                                        <Puzzle className="h-5 w-5 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            Projects
                                        </div>
                                        <div className="text-sm sm:text-base font-extrabold text-[color:var(--tutorial-ink,#1f2a6b)] dark:text-white">
                                            <EditableInlineField
                                                value={metadata.projectCount || (isEditor ? 0 : "")}
                                                type="number"
                                                isEditor={isEditor}
                                                label="Projects Count"
                                                onSave={async (val) => {
                                                    await handleUpdateMetadataField("projectCount", Number(val))
                                                }}
                                                renderDisplay={(val) => <span>{val}</span>}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stat 4: Prerequisites */}
                            {((course.prerequisites && course.prerequisites.length > 0) || isEditor) && (
                                <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0 text-sky-600">
                                        <CheckSquare className="h-5 w-5 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            Prerequisites
                                        </div>
                                        <div className="text-sm sm:text-base font-extrabold text-[color:var(--tutorial-ink,#1f2a6b)] dark:text-white">
                                            <EditableInlineField
                                                value={
                                                    course.prerequisites?.length > 0
                                                        ? course.prerequisites.join(", ")
                                                        : isEditor
                                                        ? "None"
                                                        : ""
                                                }
                                                isEditor={isEditor}
                                                label="Prerequisites"
                                                onSave={(val) => handleUpdateCourseField("prerequisites", val)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* About This Course / Rich Overview Section */}
                    <div className="mt-12 space-y-4">
                        <div className="flex items-center justify-between">
                            {!course.description?.trim().startsWith("# ") && (
                                <h2 className="text-xl sm:text-2xl font-extrabold text-[#10162F] dark:text-white tracking-tight">
                                    About this course
                                </h2>
                            )}
                            {isEditor && !editingOverviewDescription && (
                                <button
                                    type="button"
                                    onClick={() => setEditingOverviewDescription(true)}
                                    className="px-3.5 py-1.5 bg-[#FFD15C] text-[#10162F] border-2 border-[#10162F] rounded-xl font-extrabold text-xs shadow-[2px_2px_0px_#10162F] flex items-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span>Edit Overview</span>
                                </button>
                            )}
                        </div>

                        {editingOverviewDescription ? (
                            <UniversalEditor
                                mode="edit"
                                entityType="course"
                                entityId={course.id}
                                initialData={{
                                    title: course.title,
                                    description: course.description,
                                    difficulty: course.difficulty,
                                    technology: course.technology,
                                    duration: calculatedHours,
                                    prerequisites: course.prerequisites,
                                    isPremium: course.isPremium,
                                    status: course.status,
                                    projectCount: metadata.projectCount,
                                    featuresTitle: metadata.featuresTitle,
                                    features: metadata.features,
                                }}
                                breadcrumb={[course.title, "Course Overview"]}
                                onSave={handleSaveCourseDescription}
                                onCancel={() => setEditingOverviewDescription(false)}
                            />
                        ) : (
                            <div className="bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] text-[#10162F] dark:text-gray-200">
                                <CodecademyContentRenderer content={course.description} />
                            </div>
                        )}
                    </div>

                    {/* Continuous Tutorial Content Stream */}
                    <div className="mt-8 space-y-8">
                        {isEditor && (
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleOpenNewChapterWithEditor}
                                    className="px-4 py-2 bg-[#3A10E5] hover:bg-[#300ec2] text-white font-extrabold text-xs rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] flex items-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>+ Add Chapter</span>
                                </button>
                            </div>
                        )}

                        {/* CONTINUOUS TUTORIAL CONTENT STREAM */}
                        <div className="space-y-12">
                            {chapters.map((chapter: any, chapterIndex: number) => {
                                const hasDocumentContent = Boolean(
                                    chapter.description && chapter.description.trim().length > 0
                                )

                                return (
                                    <section
                                        key={chapter.id}
                                        id={"chapter-" + chapter.id}
                                        className="scroll-mt-28 space-y-6 pt-6"
                                    >
                                        {/* Chapter Header Card */}
                                        <div className="bg-[#FFF5EB] dark:bg-[#1E293B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 p-5 sm:p-6 shadow-[4px_4px_0px_0px_#10162F] flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-[#3A10E5] dark:text-indigo-400 uppercase tracking-wider bg-white dark:bg-gray-800 px-2.5 py-0.5 rounded border border-[#10162F]/15">
                                                        Module {chapterIndex + 1} of {chapters.length}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                        {(chapter.lessons?.length || 0)} subtopics
                                                    </span>
                                                    {hasDocumentContent && (
                                                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 uppercase tracking-wider">
                                                            Doc Ready
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl sm:text-3xl font-extrabold text-[#10162F] dark:text-white mt-1.5 tracking-tight">
                                                    {chapter.title}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isEditor && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setActiveTab({
                                                                type: "chapter",
                                                                chapterId: chapter.id,
                                                                mode: "edit",
                                                            })
                                                        }
                                                        className="px-3.5 py-1.5 bg-[#FFD15C] hover:bg-[#ffc83b] text-[#10162F] text-xs font-extrabold rounded-xl border border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F] flex items-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                                        title="Edit in Delhi Post Editor"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        <span>Edit Chapter</span>
                                                    </button>
                                                )}

                                                {isEditor && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCreatingLessonChapterId(chapter.id)
                                                            setCreatingLessonPreset(null)
                                                        }}
                                                        className="px-3.5 py-1.5 bg-[#3A10E5] hover:bg-[#300ec2] text-white text-xs font-extrabold rounded-xl border border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F] flex items-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        <span>Add Subtopic</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Inline Lesson Creator if open */}
                                        {creatingLessonChapterId === chapter.id && (
                                            <div className="bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 p-5 shadow-[4px_4px_0px_#10162F]">
                                                <UniversalEditor
                                                    mode="create"
                                                    entityType="lesson"
                                                    parentId={chapter.id}
                                                    initialData={{
                                                        title: creatingLessonPreset?.title || "",
                                                        type: creatingLessonPreset?.type || "READING",
                                                        content: "",
                                                        duration: 15,
                                                        xpReward: 10,
                                                    }}
                                                    breadcrumb={[
                                                        course.title,
                                                        chapter.title,
                                                        "New Subtopic",
                                                    ]}
                                                    onSave={async (data) => {
                                                        await handleCreateLesson(chapter.id, data)
                                                        setCreatingLessonPreset(null)
                                                    }}
                                                    onCancel={() => {
                                                        setCreatingLessonChapterId(null)
                                                        setCreatingLessonPreset(null)
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Chapter Document Overview Body if authored */}
                                        {hasDocumentContent && (
                                            <div className="bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 shadow-[4px_4px_0px_#10162F] p-6 sm:p-8 space-y-4">
                                                <div className="text-xs font-black uppercase text-[#3A10E5] dark:text-indigo-400 tracking-wider">
                                                    Module Overview & Notes
                                                </div>
                                                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[#10162F] dark:text-gray-200">
                                                    <CodecademyContentRenderer content={chapter.description} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Chapter Lessons / Subtopics Rendered Continuously */}
                                        <div className="space-y-6">
                                            {chapter.lessons && chapter.lessons.length > 0 ? (
                                                chapter.lessons.map((lesson: any, lessonIndex: number) => (
                                                    <article
                                                        key={lesson.id}
                                                        id={"lesson-" + lesson.id}
                                                        className="scroll-mt-28 bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 shadow-[4px_4px_0px_#10162F] p-6 sm:p-8 space-y-6 transition-all"
                                                    >
                                                        {/* Subtopic Header */}
                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-100 dark:border-gray-800 pb-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#3A10E5] text-white">
                                                                        Topic {chapterIndex + 1}.{lessonIndex + 1}
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                                        {lesson.type || "Article"}
                                                                    </span>
                                                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {lesson.duration || 15} min read
                                                                    </span>
                                                                    {lesson.xpReward ? (
                                                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                                                            <Sparkles className="h-3 w-3" />
                                                                            +{lesson.xpReward} XP
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                                <h4 className="text-xl sm:text-2xl font-extrabold text-[#10162F] dark:text-white tracking-tight">
                                                                    {lesson.title}
                                                                </h4>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {isEditor && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setActiveTab({
                                                                                type: "lesson",
                                                                                chapterId: chapter.id,
                                                                                lessonId: lesson.id,
                                                                                mode: "edit",
                                                                            })
                                                                        }}
                                                                        className="px-3 py-1.5 bg-[#3A10E5] hover:bg-[#300ec2] text-white text-xs font-black rounded-xl border border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F] flex items-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px] transition-all"
                                                                        title="Edit in Rosera Editor"
                                                                    >
                                                                        <Sparkles className="h-3.5 w-3.5 text-[#FFD15C]" />
                                                                        <span>🌹 Rosera Editor</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Subtopic Content (Rosera Fluid Interactive Engine) */}
                                                        {lesson.content && lesson.content.trim().length > 0 ? (
                                                            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                                                                <RoseraRenderer content={lesson.content} theme={courseTheme} courseTitle={course.title} />
                                                            </div>
                                                        ) : (
                                                            <div className="py-8 text-center bg-[#FFFDF9] dark:bg-[#1E293B]/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-2">
                                                                <p className="text-xs font-bold text-gray-500">
                                                                    This subtopic does not have written content yet.
                                                                </p>
                                                                {isEditor && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setActiveTab({
                                                                                type: "lesson",
                                                                                chapterId: chapter.id,
                                                                                lessonId: lesson.id,
                                                                                mode: "edit",
                                                                            })
                                                                        }
                                                                        className="px-4 py-2 bg-[#3A10E5] hover:bg-[#300ec2] text-white rounded-xl font-extrabold text-xs border border-[#10162F] shadow-[2px_2px_0px_#10162F] inline-flex items-center gap-1.5"
                                                                    >
                                                                        <Sparkles className="h-3.5 w-3.5 text-[#FFD15C]" />
                                                                        <span>Write with Rosera Editor</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </article>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center bg-white dark:bg-[#0B132B] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                                                    <p className="text-xs font-bold text-gray-500">
                                                        No subtopics added to this module yet.
                                                    </p>
                                                    {isEditor && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCreatingLessonChapterId(chapter.id)
                                                                setCreatingLessonPreset(null)
                                                            }}
                                                            className="mt-3 px-4 py-2 bg-[#3A10E5] text-white rounded-xl text-xs font-extrabold border border-[#10162F]"
                                                        >
                                                            + Add First Subtopic
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )
                            })}

                            {chapters.length === 0 && (
                                <div className="p-12 text-center bg-white rounded-2xl border-2 border-[#10162F] shadow-[4px_4px_0px_#10162F]">
                                    <p className="text-gray-500 font-medium text-sm">
                                        No chapters created for this course yet.
                                    </p>
                                    {isEditor && (
                                        <button
                                            type="button"
                                            onClick={handleOpenNewChapterWithEditor}
                                            className="mt-4 px-6 py-2.5 bg-[#3A10E5] hover:bg-[#300ec2] text-white font-extrabold text-xs rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F]"
                                        >
                                            + Create First Chapter
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Teachers / Faculty Section */}
                            <div className="mt-12">
                                <CourseTeachersSection
                                    title="Know Your Teachers"
                                    subtitle="Learn from top educators and experienced subject matter experts"
                                />
                            </div>

                            {chapters.length > 0 && (
                                <div className="mt-14 p-8 sm:p-10 text-center bg-[#FFF5EB] dark:bg-[#1E293B] rounded-2xl border-2 border-[#10162F] dark:border-gray-700 shadow-[4px_4px_0px_#10162F] space-y-3">
                                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 border-2 border-[#10162F]">
                                        <CheckCircle className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#10162F] dark:text-white">
                                        End of Tutorial
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                                        You have reached the end of <span className="font-extrabold text-[#10162F] dark:text-white">{course.title}</span>. Great job expanding your skills!
                                    </p>
                                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => scrollToSection("overview")}
                                            className="px-4 py-2 bg-white dark:bg-gray-800 text-[#10162F] dark:text-white font-extrabold text-xs rounded-xl border-2 border-[#10162F] dark:border-gray-700 shadow-[2px_2px_0px_#10162F] hover:bg-gray-50 transition-all"
                                        >
                                            Back to Overview ↑
                                        </button>
                                        <Link
                                            href="/tutorials"
                                            className="px-4 py-2 bg-[#3A10E5] text-white font-extrabold text-xs rounded-xl border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] hover:bg-[#300ec2] transition-all"
                                        >
                                            Browse More Tutorials →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const searchParams = useSearchParams()
    const viewQuery = searchParams?.get("view")
    const [viewInStudio, setViewInStudio] = useState(viewQuery === "studio")

    useEffect(() => {
        if (viewQuery === "studio") {
            setViewInStudio(true)
        }
    }, [viewQuery])

    const meta = safeParseJson(course.metadataJson)
    const isTutorialCourse = meta?.format === "tutorial" || Boolean(course.externalId)
    const isAspirantbookTutorial = !viewInStudio && isTutorialCourse

    if (isAspirantbookTutorial) {
        return (
            <AspirantbookTutorialView
                course={course}
                chapters={chapters}
                isEditor={isEditor}
                onSwitchToStudio={() => setViewInStudio(true)}
            />
        )
    }

    return (
        <div
            className="min-h-[calc(100vh-60px)] flex flex-col"
            style={{
                backgroundColor: "var(--tutorial-bg, #e4efff)",
                color: "var(--tutorial-ink, #1f2a6b)",
                ...((themeStyles as any) || {}),
            }}
        >
            {/* Top Workspace Status Bar & Universal Navigation */}
            <div className="bg-[#FFFDF9]/95 dark:bg-[#0B132B]/95 backdrop-blur-sm border-b-2 border-[#10162F] dark:border-gray-800 px-3 sm:px-6 py-2.5 flex items-center justify-between text-xs sticky top-[60px] z-30 shadow-xs gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Back to All Tutorials Button */}
                    <Link
                        href="/tutorials"
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#3A10E5] text-white hover:bg-[#300ec2] border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] text-xs font-black flex items-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px] transition-all flex-shrink-0"
                        title="Back to All Tutorials"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span className="hidden sm:inline">Tutorials</span>
                    </Link>

                    {/* Clickable Breadcrumbs (Desktop & Tablet) */}
                    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 truncate min-w-0">
                        <Link
                            href="/dashboard"
                            className="hover:text-[#3A10E5] dark:hover:text-white flex items-center gap-1 transition-colors flex-shrink-0"
                            title="Dashboard Home"
                        >
                            <Home className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Home</span>
                        </Link>
                        <span className="text-gray-400">/</span>
                        <Link
                            href="/tutorials"
                            className="hover:text-[#3A10E5] dark:hover:text-white transition-colors flex-shrink-0"
                        >
                            Tutorials
                        </Link>
                        <span className="text-gray-400">/</span>
                        <button
                            type="button"
                            onClick={() => scrollToSection("overview")}
                            className="hover:text-[#3A10E5] dark:hover:text-white transition-colors truncate max-w-[120px] md:max-w-[180px] lg:max-w-[260px] text-left font-extrabold text-[#10162F] dark:text-gray-200"
                            title={course.title}
                        >
                            {course.title}
                        </button>
                        <span className="text-gray-400">/</span>
                        <span className="text-[#3A10E5] dark:text-indigo-400 font-extrabold truncate max-w-[140px] md:max-w-[220px]">
                            {activeTab.type === "overview"
                                ? "Overview"
                                : activeTab.type === "new_chapter"
                                ? "New Chapter"
                                : activeTab.type === "chapter"
                                ? chapters.find((c) => c.id === activeTab.chapterId)?.title || "Chapter"
                                : chapters.flatMap((c) => c.lessons || []).find((l) => l.id === activeTab.lessonId)?.title || "Subtopic"}
                        </span>
                    </nav>

                    {/* Compact Mobile Course Title */}
                    <div className="sm:hidden flex items-center gap-1 text-xs truncate">
                        <button
                            type="button"
                            onClick={() => scrollToSection("overview")}
                            className="truncate max-w-[120px] font-extrabold text-[#10162F] dark:text-white text-left"
                            title={course.title}
                        >
                            {course.title}
                        </button>
                    </div>
                </div>

                {/* Right Action Icons & Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditor && (
                        <button
                            type="button"
                            onClick={() => setViewInStudio(false)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-[#0e9f78] text-white hover:bg-[#0c8a68] border-2 border-[color:var(--tutorial-ink,#1f2a6b)] shadow-[1.5px_1.5px_0px_var(--tutorial-ink,#1f2a6b)] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                            title="Preview as learner (Learner View)"
                        >
                            <ExternalLink className="h-3 w-3 stroke-[2.5]" />
                            <span>Preview as Learner</span>
                        </button>
                    )}
                    {isEditor && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#FFD15C] text-[#10162F] border-2 border-[#10162F] shadow-[1.5px_1.5px_0px_#10162F]">
                            Teacher Studio
                        </span>
                    )}
                </div>
            </div>

            {/* Main Two-Column Layout */}
            <div className="flex-1 flex flex-col lg:flex-row items-stretch">
                {/* Left Column: Document tabs sidebar with mobile off-canvas drawer */}
                <CourseDocumentTabs
                    course={course}
                    chapters={chapters}
                    activeTab={activeTab}
                    onSelectOverview={() => {
                        setActiveTab({ type: "overview" })
                        scrollToSection("overview")
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setIsTabsCollapsed(true)
                        }
                    }}
                    onSelectChapter={(chapterId, mode = "view") => {
                        if (mode === "edit") {
                            setActiveTab({ type: "chapter", chapterId, mode: "edit" })
                        } else {
                            setActiveTab({ type: "chapter", chapterId, mode: "view" })
                            scrollToSection("chapter-" + chapterId)
                        }
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setIsTabsCollapsed(true)
                        }
                    }}
                    onSelectLesson={(chapterId, lessonId, mode = "view") => {
                        if (mode === "edit") {
                            setActiveTab({ type: "lesson", chapterId, lessonId, mode: "edit" })
                        } else {
                            setActiveTab({ type: "lesson", chapterId, lessonId, mode: "view" })
                            scrollToSection("lesson-" + lessonId)
                        }
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setIsTabsCollapsed(true)
                        }
                    }}
                    onAddChapter={handleOpenNewChapterWithEditor}
                    onEditChapter={(chapterId) =>
                        setActiveTab({ type: "chapter", chapterId, mode: "edit" })
                    }
                    onAddLesson={(chapterId) => {
                        setCreatingLessonChapterId(chapterId)
                        setCreatingLessonPreset(null)
                        setActiveTab({ type: "chapter", chapterId, mode: "view" })
                    }}
                    onDuplicateChapter={handleDuplicateChapter}
                    onDeleteChapter={handleDeleteChapter}
                    onDuplicateLesson={handleDuplicateLesson}
                    onDeleteLesson={handleDeleteLesson}
                    onImportCurriculum={() => setIsImportModalOpen(true)}
                    isEditor={isEditor}
                    isCollapsed={isTabsCollapsed}
                    onToggleCollapse={() => setIsTabsCollapsed((prev) => !prev)}
                />

                {/* Right Column: Main Document Canvas (Natural Window Scrolling) */}
                <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 w-full max-w-6xl mx-auto">
                    {renderCanvasContent()}
                </main>
            </div>

            {/* AI & Curriculum Package Import Modal */}
            <TutorialImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                courseId={course.id}
                onSuccess={() => {
                    toast.success("Curriculum imported successfully!")
                    router.refresh()
                    window.location.reload()
                }}
            />

            {/* Free Demo Scheduling Modal */}
            <ScheduleDemoModal
                isOpen={isScheduleDemoOpen}
                onClose={() => setIsScheduleDemoOpen(false)}
                course={{
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    thumbnailUrl: course.thumbnailUrl,
                    price: course.price,
                }}
            />
        </div>
    )
}
