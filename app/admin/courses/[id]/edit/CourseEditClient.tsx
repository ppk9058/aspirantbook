"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PublishButton } from "@/components/admin/PublishButton"
import { ChapterList } from "@/components/admin/ChapterList"
import { ChapterEditor } from "@/components/admin/ChapterEditor"
import { LessonEditor } from "@/components/admin/LessonEditor"
import { RichContentEditor } from "@/components/editor/RichContentEditor"
import { CodecademyContentRenderer } from "@/components/editor/CodecademyContentRenderer"
import { UniversalEditor } from "@/components/editor/UniversalEditor"
import { TutorialImportModal } from "@/components/editor/TutorialImportModal"
import { updateCourseDraft } from "@/lib/actions/admin/courses"
import { updateChapter, updateChaptersGateMode } from "@/lib/actions/admin/chapters"
import { updateLesson } from "@/lib/actions/admin/lessons"
import { GateControlPanel } from "@/components/admin/authwall/GateControlPanel"
import { SelectedGateToolbar, type SelectedItemGateInfo, type GateMode } from "@/components/admin/authwall/SelectedGateToolbar"
import { publishCourse, unpublishCourse } from "@/lib/actions/admin/publishing"
import { Edit2, Check, Loader2, ArrowLeft, ExternalLink, CheckCircle2, XCircle, Video, Sparkles } from "lucide-react"

interface CourseEditClientProps {
    course: any
    chapters: any[]
    backUrl?: string
    studioTitle?: string
}

export default function CourseEditClient({
    course,
    chapters: initialChapters,
    backUrl,
    studioTitle = "Tutorial Studio (Rosera Editor)",
}: CourseEditClientProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const isTeacher = session?.user?.role === "TEACHER"
    const effectiveBackUrl = backUrl || (isTeacher ? "/teacher/tutorials" : "/admin/tutorials")
    const [chapters, setChapters] = useState(initialChapters)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<"chapter" | "lesson" | null>(null)
    const [editorMode, setEditorMode] = useState<"view" | "edit" | "new-chapter" | "new-lesson">("view")
    const [newLessonChapterId, setNewLessonChapterId] = useState<string | null>(null)
    const [isEditingInfo, setIsEditingInfo] = useState(false)
    const [editTitle, setEditTitle] = useState(course.title || "")
    const [editDescription, setEditDescription] = useState(course.description || "")
    const [editDifficulty, setEditDifficulty] = useState(course.difficulty || "BEGINNER")
    const [editTechnology, setEditTechnology] = useState(course.technology || "")
    const [editIsPremium, setEditIsPremium] = useState(course.isPremium || false)
    const [isGated, setIsGated] = useState<boolean>(course.isGated ?? false)
    const [previewPercentage, setPreviewPercentage] = useState<number>(course.previewPercentage ?? 20)
    const [seoMode, setSeoMode] = useState<"preview" | "bot-full">((course.seoMode as any) || "preview")
    const [gateTitle, setGateTitle] = useState<string>(course.gateTitle || "")
    const [gateSubtitle, setGateSubtitle] = useState<string>(course.gateSubtitle || "")
    const [currentStatus, setCurrentStatus] = useState<string>(course.status || "DRAFT")
    const [editStatus, setEditStatus] = useState<string>(course.status || "DRAFT")
    const [isTogglingPublish, setIsTogglingPublish] = useState(false)
    const [isSavingInfo, setIsSavingInfo] = useState(false)
    const [isSavingGate, setIsSavingGate] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Sync all course and gate props whenever course prop changes (e.g. after refresh or navigation)
    useEffect(() => {
        setIsGated(course.isGated ?? false)
        setPreviewPercentage(course.previewPercentage ?? 20)
        setSeoMode((course.seoMode as any) || "preview")
        setGateTitle(course.gateTitle || "")
        setGateSubtitle(course.gateSubtitle || "")
        setEditTitle(course.title || "")
        setEditDescription(course.description || "")
        setEditDifficulty(course.difficulty || "BEGINNER")
        setEditTechnology(course.technology || "")
        setEditIsPremium(course.isPremium || false)
        setCurrentStatus(course.status || "DRAFT")
        setEditStatus(course.status || "DRAFT")
    }, [course])

    const handleTogglePublish = async () => {
        setIsTogglingPublish(true)
        try {
            if (currentStatus === "PUBLISHED") {
                const res = await unpublishCourse(course.id)
                if (res?.success) {
                    setCurrentStatus("DRAFT")
                    setEditStatus("DRAFT")
                    toast.success("Course unpublished (draft)")
                }
            } else {
                const res = await publishCourse(course.id)
                if (res?.success) {
                    setCurrentStatus("PUBLISHED")
                    setEditStatus("PUBLISHED")
                    toast.success("Course published live!")
                }
            }
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || "Failed to update course status")
        } finally {
            setIsTogglingPublish(false)
        }
    }

    const handleSaveCourseInfo = async () => {
        setIsSavingInfo(true)
        try {
            await updateCourseDraft(course.id, {
                title: editTitle,
                description: editDescription,
                difficulty: editDifficulty,
                technology: editTechnology,
                isPremium: editIsPremium,
                status: editStatus,
                isGated,
                previewPercentage,
                seoMode,
                gateTitle: gateTitle || null,
                gateSubtitle: gateSubtitle || null,
            })
            setCurrentStatus(editStatus)
            setIsEditingInfo(false)
            toast.success("Course details saved successfully")
            refreshData()
        } catch (err: any) {
            toast.error(err.message || "Failed to update course details")
        } finally {
            setIsSavingInfo(false)
        }
    }

    const handleSaveGateSettings = async () => {
        setIsSavingGate(true)
        try {
            await updateCourseDraft(course.id, {
                isGated,
                previewPercentage,
                seoMode,
                gateTitle: gateTitle || null,
                gateSubtitle: gateSubtitle || null,
            })
            toast.success("Gate settings saved successfully!")
            router.refresh()
        } catch (err: any) {
            console.error("Failed saving gate settings:", err)
            toast.error(err.message || "Failed saving gate settings")
        } finally {
            setIsSavingGate(false)
        }
    }

    const handleGateChange = async (updated: any) => {
        const nextIsGated = updated.isGated !== undefined ? updated.isGated : isGated
        const nextPct = updated.previewPercentage !== undefined ? updated.previewPercentage : previewPercentage
        const nextSeo = updated.seoMode !== undefined ? updated.seoMode : seoMode
        const nextTitle = updated.gateTitle !== undefined ? updated.gateTitle : gateTitle
        const nextSubtitle = updated.gateSubtitle !== undefined ? updated.gateSubtitle : gateSubtitle

        setIsGated(nextIsGated)
        setPreviewPercentage(nextPct)
        setSeoMode(nextSeo)
        setGateTitle(nextTitle)
        setGateSubtitle(nextSubtitle)

        try {
            await updateCourseDraft(course.id, {
                isGated: nextIsGated,
                previewPercentage: nextPct,
                seoMode: nextSeo,
                gateTitle: nextTitle || null,
                gateSubtitle: nextSubtitle || null,
            })
            router.refresh()
        } catch (err: any) {
            console.error("Failed auto-saving gate settings:", err)
        }
    }

    const handleUpdateChapterGate = async (chapterId: string, gate: any) => {
        try {
            await updateChapter(chapterId, {
                gateMode: gate.gateMode,
                previewPercentage: gate.previewPercentage,
            })
            setChapters((prev: any[]) =>
                prev.map((c) =>
                    c.id === chapterId
                        ? { ...c, gateMode: gate.gateMode, previewPercentage: gate.previewPercentage }
                        : c
                )
            )
            toast.success("Chapter gate updated")
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || "Failed updating chapter gate mode")
        }
    }

    const handleUpdateLessonGate = async (
        chapterId: string,
        lessonId: string,
        gate: any
    ) => {
        try {
            await updateLesson(lessonId, {
                gateMode: gate.gateMode,
                previewPercentage: gate.previewPercentage,
            })
            setChapters((prev: any[]) =>
                prev.map((c) => {
                    if (c.id !== chapterId) return c
                    return {
                        ...c,
                        lessons: c.lessons.map((l: any) =>
                            l.id === lessonId
                                ? { ...l, gateMode: gate.gateMode, previewPercentage: gate.previewPercentage }
                                : l
                        ),
                    }
                })
            )
            toast.success("Lesson gate updated")
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || "Failed updating lesson gate mode")
        }
    }

    const handleBulkUpdateChapters = async (
        chapterIds: string[],
        gateMode: "inherit" | "free" | "preview" | "locked",
        pct?: number | null
    ) => {
        try {
            await updateChaptersGateMode(course.id, chapterIds, gateMode, pct)
            setChapters((prev: any[]) =>
                prev.map((c) =>
                    chapterIds.includes(c.id)
                        ? { ...c, gateMode, previewPercentage: pct !== undefined ? pct : c.previewPercentage }
                        : c
                )
            )
            toast.success(`Updated ${chapterIds.length} chapters to ${gateMode}`)
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || "Failed bulk updating chapters")
        }
    }

    const refreshData = () => {
        router.refresh()
    }

    // Update chapters when initialChapters changes
    useEffect(() => {
        setChapters(initialChapters)
    }, [initialChapters])

    const handleSelect = (id: string, type: "chapter" | "lesson") => {
        setSelectedId(id)
        setSelectedType(type)
        setEditorMode("edit")
    }

    const handleAddChapter = () => {
        setSelectedId(null)
        setSelectedType(null)
        setEditorMode("new-chapter")
    }

    const handleAddLesson = (chapterId: string) => {
        setNewLessonChapterId(chapterId)
        setSelectedId(null)
        setSelectedType(null)
        setEditorMode("new-lesson")
    }

    const handleClose = () => {
        setEditorMode("view")
        setSelectedId(null)
        setSelectedType(null)
        setNewLessonChapterId(null)
    }

    const handleSaved = () => {
        refreshData()
    }

    // Get selected chapter or lesson
    const selectedChapter = selectedType === "chapter"
        ? chapters.find(c => c.id === selectedId)
        : null

    const selectedLesson = selectedType === "lesson"
        ? chapters.flatMap(c => c.lessons).find(l => l.id === selectedId)
        : null

    const selectedItemInfo: SelectedItemGateInfo | null = (() => {
        if (!selectedId) return null
        if (selectedType === "chapter" && selectedChapter) {
            return {
                id: selectedChapter.id,
                title: selectedChapter.title,
                type: "chapter",
                gateMode: selectedChapter.gateMode,
                previewPercentage: selectedChapter.previewPercentage,
                parentTitle: course.title,
                parentGateMode: "inherit",
                parentPreviewPercentage: previewPercentage,
            }
        }
        if (selectedType === "lesson" && selectedLesson) {
            const parentChapter = chapters.find(c => c.id === selectedLesson.chapterId)
            return {
                id: selectedLesson.id,
                title: selectedLesson.title,
                type: "lesson",
                gateMode: selectedLesson.gateMode,
                previewPercentage: selectedLesson.previewPercentage,
                parentTitle: parentChapter?.title || "Phase",
                parentGateMode: parentChapter?.gateMode || "inherit",
                parentPreviewPercentage: parentChapter?.previewPercentage ?? previewPercentage,
            }
        }
        return null
    })()

    const handleSaveSelectedItemGate = async (gate: { gateMode: GateMode; previewPercentage: number | null }) => {
        if (!selectedItemInfo) return
        if (selectedItemInfo.type === "chapter") {
            await handleUpdateChapterGate(selectedItemInfo.id, gate)
        } else if (selectedItemInfo.type === "lesson") {
            const parentChapter = chapters.find(c => c.lessons.some((l: any) => l.id === selectedItemInfo.id))
            if (parentChapter) {
                await handleUpdateLessonGate(parentChapter.id, selectedItemInfo.id, gate)
            }
        }
    }

    // Calculate stats
    const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
    const totalExercises = chapters.reduce((sum, ch) =>
        sum + ch.lessons.filter((l: any) => l.type === "EXERCISE").length, 0
    )

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header & Navigation */}
            <div className="space-y-4">
                {/* Top Navigation Row: Back button & Breadcrumbs & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <Link href={effectiveBackUrl}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-2 border-[#10162F] font-extrabold shadow-[2px_2px_0px_#10162F] hover:bg-[#FFF5EB] text-xs text-[#10162F]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                                Back to Tutorials
                            </Button>
                        </Link>
                        <span className="text-gray-300 font-bold">/</span>
                        <span className="text-xs font-bold text-[#3A10E5] uppercase tracking-wider">
                            {studioTitle}
                        </span>
                    </div>

                    {/* Quick Actions: View as Live & Publish Toggle */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsImportModalOpen(true)}
                            className="border-2 border-[#10162F] font-extrabold shadow-[2px_2px_0px_#10162F] bg-[#FFD15C] hover:bg-[#ffca3d] text-xs text-[#10162F] flex items-center gap-1.5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-[#10162F]" />
                            <span>📥 Merge Next Phase</span>
                        </Button>

                        <Link href={`${isTeacher ? "/teacher" : "/admin"}/courses/${course.id}/edit`}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-2 border-[#10162F] font-extrabold shadow-[2px_2px_0px_#10162F] hover:bg-[#FFF5EB] text-xs text-orange-600 flex items-center gap-1.5"
                            >
                                <Video className="h-3.5 w-3.5" />
                                <span>Video Studio</span>
                            </Button>
                        </Link>

                        <Link
                            href={`/courses/${course.slug || course.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-2 border-[#10162F] font-extrabold shadow-[2px_2px_0px_#10162F] hover:bg-[#FFF5EB] text-xs text-[#10162F] flex items-center gap-1.5"
                            >
                                <ExternalLink className="h-3.5 w-3.5 text-[#3A10E5]" />
                                <span>View as Live</span>
                            </Button>
                        </Link>

                        <Button
                            size="sm"
                            onClick={handleTogglePublish}
                            disabled={isTogglingPublish}
                            className={`font-extrabold text-xs border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] flex items-center gap-1.5 transition-all ${
                                currentStatus === "PUBLISHED"
                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-900"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                        >
                            {isTogglingPublish ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : currentStatus === "PUBLISHED" ? (
                                <>
                                    <XCircle className="h-3.5 w-3.5 text-amber-800" />
                                    <span>Revert to Draft</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                    <span>Publish Course</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Course Title & Status Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10162F] tracking-tight">{course.title}</h1>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Edit curriculum, rich lessons, syllabus, and live settings</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 border-[#10162F] ${
                                currentStatus === "PUBLISHED"
                                    ? "bg-[#FFD15C] text-black shadow-[2px_2px_0px_#10162F]"
                                    : "bg-gray-100 text-gray-700 shadow-[2px_2px_0px_#10162F]"
                            }`}
                        >
                            {currentStatus === "PUBLISHED" ? "● LIVE / PUBLISHED" : "○ DRAFT"}
                        </span>
                        {course.isPremium && (
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#3A10E5] text-white border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F]">
                                Pro
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Centralized Authwall Gate Controls */}
            <GateControlPanel
                gate={{
                    isGated,
                    previewPercentage,
                    seoMode,
                    gateTitle,
                    gateSubtitle,
                }}
                onChange={handleGateChange}
                onSave={handleSaveGateSettings}
                isSaving={isSavingGate}
                items={[
                    ...chapters.map((c: any) => ({
                        gateMode: c.gateMode || "inherit",
                        previewPercentage: c.previewPercentage,
                    })),
                    ...chapters.flatMap((c: any) => (c.lessons || []).map((l: any) => ({
                        gateMode: l.gateMode || "inherit",
                        previewPercentage: l.previewPercentage,
                    }))),
                ]}
                moduleName="Tutorial Studio"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Course Structure */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-4">
                        <CardContent className="p-4">
                            <ChapterList
                                chapters={chapters}
                                selectedId={selectedId}
                                selectedType={selectedType}
                                onSelect={handleSelect}
                                onAddChapter={handleAddChapter}
                                onAddLesson={handleAddLesson}
                                onUpdateChapterGate={handleUpdateChapterGate}
                                onUpdateLessonGate={handleUpdateLessonGate}
                                onBulkUpdateChapters={handleBulkUpdateChapters}
                                isCourseGated={isGated}
                                coursePreviewPercentage={previewPercentage}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Selected Item Gate Toolbar */}
                    {selectedItemInfo && (
                        <SelectedGateToolbar
                            selectedItem={selectedItemInfo}
                            coursePreviewPercentage={previewPercentage}
                            isCourseGated={isGated}
                            onSave={handleSaveSelectedItemGate}
                        />
                    )}

                    {/* Editor Panel */}
                    {editorMode === "new-chapter" && (
                        <ChapterEditor
                            courseId={course.id}
                            onClose={handleClose}
                            onSaved={handleSaved}
                        />
                    )}

                    {editorMode === "new-lesson" && newLessonChapterId && (
                        <LessonEditor
                            chapterId={newLessonChapterId}
                            onClose={handleClose}
                            onSaved={handleSaved}
                        />
                    )}

                    {editorMode === "edit" && selectedType === "chapter" && selectedChapter && (
                        <ChapterEditor
                            courseId={course.id}
                            chapter={selectedChapter}
                            onClose={handleClose}
                            onSaved={handleSaved}
                        />
                    )}

                    {editorMode === "edit" && selectedType === "lesson" && selectedLesson && (
                        <LessonEditor
                            chapterId={selectedLesson.chapterId}
                            lesson={selectedLesson}
                            onClose={handleClose}
                            onSaved={handleSaved}
                        />
                    )}

                    {editorMode === "view" && (
                        isEditingInfo ? (
                            <UniversalEditor
                                mode="edit"
                                entityType="course"
                                entityId={course.id}
                                initialData={{
                                    title: editTitle,
                                    description: editDescription,
                                    difficulty: editDifficulty,
                                    technology: editTechnology,
                                    isPremium: editIsPremium,
                                    status: editStatus as any,
                                    duration: course.duration ? Math.round(course.duration / 60) : undefined,
                                    prerequisites: course.prerequisites,
                                }}
                                breadcrumb={[course.title, "Course Studio"]}
                                onSave={async (data, targetStatus) => {
                                    setIsSavingInfo(true)
                                    try {
                                        await updateCourseDraft(course.id, {
                                            title: data.title,
                                            description: data.description,
                                            difficulty: data.difficulty,
                                            technology: data.technology,
                                            isPremium: data.isPremium,
                                            status: targetStatus || data.status,
                                            duration: data.duration ? Number(data.duration) * 60 : undefined,
                                            prerequisites: data.prerequisites,
                                            isGated,
                                            previewPercentage,
                                            seoMode,
                                            gateTitle: gateTitle || null,
                                            gateSubtitle: gateSubtitle || null,
                                        })
                                        setEditTitle(data.title)
                                        setEditDescription(data.description || "")
                                        setEditDifficulty(data.difficulty || "BEGINNER")
                                        setEditTechnology(data.technology || "")
                                        setEditIsPremium(!!data.isPremium)
                                        setCurrentStatus(targetStatus || data.status || "DRAFT")
                                        setEditStatus(targetStatus || data.status || "DRAFT")
                                        setIsEditingInfo(false)
                                        refreshData()
                                    } finally {
                                        setIsSavingInfo(false)
                                    }
                                }}
                                onCancel={() => setIsEditingInfo(false)}
                            />
                        ) : (
                            <Card className="border-2 border-[#10162F] shadow-[4px_4px_0px_#10162F] bg-white">
                                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
                                    <CardTitle className="text-lg font-bold text-[#10162F]">
                                        Course Information & Overview
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditingInfo(true)}
                                        className="border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] text-xs font-bold"
                                    >
                                        <Edit2 className="h-3.5 w-3.5 mr-1 text-[#3A10E5]" />
                                        Edit Details
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Course Title</label>
                                        <p className="text-xl font-extrabold text-[#10162F] mt-1">{course.title}</p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 rounded-xl bg-[#FFF8F0] border border-gray-200 text-xs">
                                        <div>
                                            <span className="font-bold text-gray-500 uppercase block text-[10px]">Difficulty</span>
                                            <span className="font-extrabold text-[#10162F]">{course.difficulty}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-500 uppercase block text-[10px]">Technology</span>
                                            <span className="font-extrabold text-[#10162F]">{course.technology}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-500 uppercase block text-[10px]">Tier</span>
                                            <span className="font-extrabold text-[#3A10E5]">
                                                {course.isPremium ? "Premium (Pro)" : "Free Course"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                                            Overview & Syllabus Content (Rendered Preview)
                                        </label>
                                        <div className="p-5 rounded-xl border-2 border-[#10162F] bg-[#FFFDF9] max-h-[480px] overflow-y-auto shadow-[2px_2px_0px_#10162F]">
                                            <CodecademyContentRenderer content={course.description} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}

                    {/* Course Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Chapters:</span>
                                <span className="font-medium">{chapters.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Lessons:</span>
                                <span className="font-medium">{totalLessons}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Exercises:</span>
                                <span className="font-medium">{totalExercises}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card className="border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F]">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold">Course Status & Visibility</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PublishButton
                                courseId={course.id}
                                status={currentStatus}
                                onStatusChange={(newStatus) => {
                                    setCurrentStatus(newStatus)
                                    setEditStatus(newStatus)
                                    router.refresh()
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal for importing and merging phases */}
            <TutorialImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                courseId={course.id}
                onSuccess={() => {
                    router.refresh()
                }}
            />
        </div>
    )
}
