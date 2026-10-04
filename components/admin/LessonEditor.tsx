"use client"

import React, { useState, useEffect } from "react"
import { Lesson } from "@prisma/client"
import { createLesson, updateLesson, deleteLesson, getLessonBlocksAndVersions } from "@/lib/actions/admin/lessons"
import { UniversalEditor } from "@/components/editor/UniversalEditor"
import { RoseraEditor } from "@/components/editor/RoseraEditor"
import { Button } from "@/components/ui/button"
import { Layers, FileText, Loader2 } from "lucide-react"

interface LessonEditorProps {
    chapterId: string
    lesson?: Lesson
    onClose: () => void
    onSaved: () => void
}

export function LessonEditor({ chapterId, lesson, onClose, onSaved }: LessonEditorProps) {
    const [editorTab, setEditorTab] = useState<"blocks" | "metadata">("blocks")
    const [loadedBlocksData, setLoadedBlocksData] = useState<{
        activeBlocks: any[]
        hasDraft: boolean
        publishedVersionId: string | null
        draftVersionId: string | null
    } | null>(null)
    const [isLoadingBlocks, setIsLoadingBlocks] = useState(false)

    useEffect(() => {
        if (!lesson?.id) return

        let mounted = true
        setIsLoadingBlocks(true)
        getLessonBlocksAndVersions(lesson.id)
            .then((res) => {
                if (mounted) {
                    setLoadedBlocksData({
                        activeBlocks: res.activeBlocks,
                        hasDraft: res.hasDraft,
                        publishedVersionId: res.currentPublishedVersionId,
                        draftVersionId: res.currentDraftVersionId,
                    })
                }
            })
            .catch((err) => {
                console.error("Failed to load lesson blocks:", err)
            })
            .finally(() => {
                if (mounted) setIsLoadingBlocks(false)
            })

        return () => {
            mounted = false
        }
    }, [lesson?.id])

    const handleSaveMetadata = async (data: any) => {
        const payload = {
            title: data.title,
            type: data.type || "READING",
            videoUrl: data.videoUrl || undefined,
            content: data.content || undefined,
            duration: data.duration ? Number(data.duration) : undefined,
            xpReward: data.xpReward ? Number(data.xpReward) : 10,
        }

        if (lesson) {
            await updateLesson(lesson.id, payload)
        } else {
            await createLesson(chapterId, payload)
        }
        onSaved()
        onClose()
    }

    const handleDelete = async () => {
        if (!lesson) return
        await deleteLesson(lesson.id)
        onSaved()
        onClose()
    }

    // If existing lesson and in block editor mode
    if (lesson && editorTab === "blocks") {
        if (isLoadingBlocks) {
            return (
                <div className="flex flex-col items-center justify-center p-16 bg-[#FDFBF7] rounded-2xl border-2 border-[#10162F] shadow-[6px_6px_0px_#10162F]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3A10E5] mb-3" />
                    <p className="text-xs font-black uppercase tracking-wider text-[#10162F]">
                        Loading Lesson Blocks & Versions...
                    </p>
                </div>
            )
        }

        return (
            <div className="space-y-3">
                {/* Switcher bar */}
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => setEditorTab("blocks")}
                            className="text-xs font-bold gap-1.5"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            🌹 Rosera Editor
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditorTab("metadata")}
                            className="text-xs font-bold gap-1.5"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Lesson Settings & Video
                        </Button>
                    </div>
                </div>

                <RoseraEditor
                    lessonId={lesson.id}
                    chapterId={chapterId}
                    title={lesson.title}
                    initialBlocks={loadedBlocksData?.activeBlocks || []}
                    initialHasDraft={loadedBlocksData?.hasDraft || false}
                    initialPublishedVersionId={loadedBlocksData?.publishedVersionId}
                    initialDraftVersionId={loadedBlocksData?.draftVersionId}
                    onClose={onClose}
                    onSaved={onSaved}
                />
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {lesson && (
                <div className="flex items-center gap-2 px-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={editorTab === "blocks" ? "default" : "outline"}
                        onClick={() => setEditorTab("blocks")}
                        className="text-xs font-bold gap-1.5"
                    >
                        <Layers className="h-3.5 w-3.5" />
                        🌹 Rosera Editor
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={editorTab === "metadata" ? "default" : "outline"}
                        onClick={() => setEditorTab("metadata")}
                        className="text-xs font-bold gap-1.5"
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Lesson Settings & Video
                    </Button>
                </div>
            )}

            <UniversalEditor
                mode={lesson ? "edit" : "create"}
                entityType="lesson"
                entityId={lesson?.id}
                parentId={chapterId}
                initialData={{
                    title: lesson?.title || "",
                    type: lesson?.type || "READING",
                    videoUrl: lesson?.videoUrl || "",
                    content: lesson?.content || "",
                    duration: lesson?.duration || 15,
                    xpReward: lesson?.xpReward || 10,
                    status: "PUBLISHED",
                }}
                permissions={{
                    canEdit: true,
                    canPublish: true,
                    canDelete: !!lesson,
                }}
                onSave={handleSaveMetadata}
                onCancel={onClose}
                onDelete={lesson ? handleDelete : undefined}
            />
        </div>
    )
}
