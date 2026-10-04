"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Edit, Trash2, Eye, MoreVertical } from "lucide-react"
import { togglePublishAssessment, deleteAssessment } from "@/lib/actions/admin/assessments"

interface Assessment {
    id: string
    title: string
    isPublished: boolean
    _count: {
        attempts: number
    }
}

interface AssessmentActionsProps {
    assessment: Assessment
}

export default function AssessmentActions({ assessment }: AssessmentActionsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    const handleTogglePublish = async () => {
        if (isLoading) return
        setIsLoading(true)

        try {
            await togglePublishAssessment(assessment.id)
            router.refresh()
        } catch (error) {
            console.error("Failed to toggle publish:", error)
            alert("Failed to update assessment")
        } finally {
            setIsLoading(false)
            setShowMenu(false)
        }
    }

    const handleDelete = async () => {
        if (isLoading) return

        const confirmed = confirm(
            `Are you sure you want to delete "${assessment.title}"? This action cannot be undone.`
        )

        if (!confirmed) return

        setIsLoading(true)

        try {
            await deleteAssessment(assessment.id)
            router.refresh()
        } catch (error) {
            console.error("Failed to delete:", error)
            alert("Failed to delete assessment")
        } finally {
            setIsLoading(false)
            setShowMenu(false)
        }
    }

    return (
        <div className="relative flex items-center justify-end gap-2">
            <Link
                href={`/admin/assessments/${assessment.id}/attempts`}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View Attempts"
            >
                <Eye className="h-4 w-4" />
            </Link>
            <Link
                href={`/admin/assessments/${assessment.id}/edit`}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit"
            >
                <Edit className="h-4 w-4" />
            </Link>

            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>

                {showMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <button
                                onClick={handleTogglePublish}
                                disabled={isLoading}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {assessment.isPublished ? "Unpublish" : "Publish"}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isLoading || assessment._count.attempts > 0}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={assessment._count.attempts > 0 ? "Cannot delete assessment with attempts" : ""}
                            >
                                Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
