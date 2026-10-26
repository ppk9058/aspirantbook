"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, ChevronRight, ChevronLeft, Lock, Edit3 } from "lucide-react"
import Link from "next/link"
import { markLessonComplete, trackVideoProgress } from "@/lib/actions/course/progress"
import { updateLesson } from "@/lib/actions/admin/lessons"
import { CodecademyContentRenderer } from "@/components/editor/CodecademyContentRenderer"
import { UniversalEditor } from "@/components/editor/UniversalEditor"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import VideoPlayer from "./VideoPlayer"
import LessonSidebar from "./LessonSidebar"

interface LessonViewerProps {
    lesson: any
    course: any
    chapters: any[]
    progressMap: Record<string, any>
    nextLesson: any
    prevLesson: any
    isEditor?: boolean
}

export default function LessonViewer({
    lesson,
    course,
    chapters,
    progressMap,
    nextLesson,
    prevLesson,
    isEditor = false,
}: LessonViewerProps) {
    const router = useRouter()
    const [currentLesson, setCurrentLesson] = useState(lesson)
    const [isEditing, setIsEditing] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [scrollProgress, setScrollProgress] = useState(0)
    const contentRef = useRef<HTMLDivElement>(null)
    const lastTrackedRef = useRef(0)

    useEffect(() => {
        setCurrentLesson(lesson)
        setIsEditing(false)
    }, [lesson])

    const handleSaveLesson = async (data: any, status?: "DRAFT" | "PUBLISHED") => {
        await updateLesson(currentLesson.id, {
            title: data.title,
            type: data.type,
            videoUrl: data.videoUrl,
            content: data.content,
            duration: data.duration,
            xpReward: data.xpReward,
        })
        setCurrentLesson((prev: any) => ({
            ...prev,
            title: data.title,
            type: data.type,
            videoUrl: data.videoUrl,
            content: data.content,
            duration: data.duration,
            xpReward: data.xpReward,
        }))
        setIsEditing(false)
        toast.success("Lesson updated successfully!")
        router.refresh()
    }

    const isCompleted = progressMap[lesson.id]?.completed || false

    const handleMarkComplete = useCallback(async () => {
        if (isCompleting) return
        setIsCompleting(true)
        try {
            await markLessonComplete(lesson.id)
            toast.success("Lesson marked as complete!")
            router.refresh()
        } catch (error) {
            toast.error("Failed to mark lesson as complete")
        } finally {
            setIsCompleting(false)
        }
    }, [isCompleting, lesson.id, router])

    // Scroll tracking for non-video lessons
    useEffect(() => {
        if (lesson.videoUrl) return // Skip scroll tracking if video exists

        const handleScroll = () => {
            if (!contentRef.current) return

            const element = contentRef.current
            const scrollTop = element.scrollTop
            const scrollHeight = element.scrollHeight - element.clientHeight

            if (scrollHeight === 0) {
                setScrollProgress(100)
                return
            }

            const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100))
            setScrollProgress(progress)

            // Track every 10% progress
            const progressStep = Math.floor(progress / 10) * 10
            if (progressStep > lastTrackedRef.current && progressStep >= 10) {
                lastTrackedRef.current = progressStep

                // Track time spent (estimate: 30 seconds per 10% of content)
                const timeSpent = 30
                trackVideoProgress(lesson.id, timeSpent).catch((err) => console.warn("Track progress warning:", err))
            }

            // Auto-complete at 90% scroll
            if (progress >= 90 && !isCompleted) {
                handleMarkComplete()
            }
        }

        const element = contentRef.current
        if (element) {
            element.addEventListener("scroll", handleScroll)
            return () => element.removeEventListener("scroll", handleScroll)
        }
    }, [lesson.id, lesson.videoUrl, isCompleted, handleMarkComplete])

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Video Player - Only show if lesson has video and not in edit mode */}
                {!isEditing && currentLesson.videoUrl && (
                    <div className="bg-black">
                        <VideoPlayer
                            url={currentLesson.videoUrl}
                            lessonId={currentLesson.id}
                            onComplete={handleMarkComplete}
                        />
                    </div>
                )}

                {/* Lesson Info */}
                <div ref={contentRef} className="flex-1 overflow-auto p-4 sm:p-6">
                    <div className="max-w-4xl mx-auto">
                        {isEditing ? (
                            <UniversalEditor
                                mode="edit"
                                entityType="lesson"
                                entityId={currentLesson.id}
                                parentId={currentLesson.chapterId}
                                initialData={{
                                    title: currentLesson.title,
                                    content: currentLesson.content || "",
                                    type: currentLesson.type,
                                    videoUrl: currentLesson.videoUrl || "",
                                    duration: currentLesson.duration || 15,
                                    xpReward: currentLesson.xpReward || 10,
                                    status: "PUBLISHED",
                                }}
                                breadcrumb={[course.title, currentLesson.chapter?.title || "Chapter", currentLesson.title]}
                                onSave={handleSaveLesson}
                                onCancel={() => setIsEditing(false)}
                            />
                        ) : (
                            <>
                                {/* Header */}
                                <div className="mb-6">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Link href={`/courses/${course.slug}`} className="hover:text-purple-600 font-bold">
                                                {course.title}
                                            </Link>
                                            <ChevronRight className="h-4 w-4" />
                                            <span className="font-medium">{currentLesson.chapter?.title || "Module"}</span>
                                        </div>

                                        {isEditor && (
                                            <Button
                                                size="sm"
                                                onClick={() => setIsEditing(true)}
                                                className="bg-[#FFD15C] hover:bg-[#ffc93b] text-[#10162F] font-extrabold text-xs border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F] flex items-center gap-1.5"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                                <span>Edit Article / Lesson</span>
                                            </Button>
                                        )}
                                    </div>

                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10162F] mb-2">{currentLesson.title}</h1>
                                    {isCompleted && (
                                        <Badge className="bg-green-600 text-white font-bold">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Completed
                                        </Badge>
                                    )}

                                    {/* Scroll Progress Indicator - Only for non-video lessons */}
                                    {!currentLesson.videoUrl && scrollProgress > 0 && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                <span>Reading Progress</span>
                                                <span>{Math.round(scrollProgress)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#3A10E5] transition-all"
                                                    style={{ width: `${scrollProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Content - Rendered with CodecademyContentRenderer */}
                                {currentLesson.content && (
                                    <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_#10162F] mb-8">
                                        <CodecademyContentRenderer content={currentLesson.content} />
                                    </div>
                                )}

                                {/* Slides/PDF - Only show if exists */}
                                {currentLesson.slides && (
                                    <Card className="p-6 mb-8 border-2 border-[#10162F] rounded-2xl shadow-[2px_2px_0px_#10162F]">
                                        <h3 className="text-sm font-bold text-[#10162F] mb-2">Lesson Materials</h3>
                                        <a
                                            href={currentLesson.slides}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#3A10E5] font-bold text-xs hover:underline"
                                        >
                                            View Slides / Supplementary PDF
                                        </a>
                                    </Card>
                                )}

                                {/* No Content Message */}
                                {!currentLesson.videoUrl && !currentLesson.content && !currentLesson.slides && (
                                    <div className="p-12 text-center bg-white rounded-2xl border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F]">
                                        <p className="text-gray-500 font-medium text-sm">No content available for this lesson yet.</p>
                                        {isEditor && (
                                            <Button
                                                size="sm"
                                                onClick={() => setIsEditing(true)}
                                                className="mt-4 bg-[#3A10E5] text-white font-bold text-xs"
                                            >
                                                Add Lesson Content Now
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between py-6 border-t">
                            <div>
                                {prevLesson && (
                                    <Link href={`/learn/${course.slug}/${prevLesson.id}`}>
                                        <Button variant="outline">
                                            <ChevronLeft className="h-4 w-4 mr-2" />
                                            Previous Lesson
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {!isCompleted && (
                                    <Button
                                        onClick={handleMarkComplete}
                                        disabled={isCompleting}
                                        variant="outline"
                                    >
                                        {isCompleting ? "Marking..." : "Mark as Complete"}
                                    </Button>
                                )}

                                {nextLesson && (
                                    <Link href={`/learn/${course.slug}/${nextLesson.id}`}>
                                        <Button className="bg-purple-600 hover:bg-purple-700">
                                            Next Lesson
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <LessonSidebar
                course={course}
                chapters={chapters}
                currentLessonId={lesson.id}
                progressMap={progressMap}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
        </div>
    )
}
