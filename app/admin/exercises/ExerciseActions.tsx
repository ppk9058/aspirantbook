"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Edit, Trash2 } from "lucide-react"
import { deleteExercise } from "@/lib/actions/admin/exercises"

interface Exercise {
    id: string
    title: string
    _count: {
        submissions: number
    }
}

interface ExerciseActionsProps {
    exercise: Exercise
}

export default function ExerciseActions({ exercise }: ExerciseActionsProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleDelete = async () => {
        if (isLoading) return

        const confirmed = confirm(
            `Are you sure you want to delete "${exercise.title}"? This action cannot be undone.`
        )

        if (!confirmed) return

        setIsLoading(true)

        try {
            await deleteExercise(exercise.id)
            router.refresh()
        } catch (error) {
            console.error("Failed to delete:", error)
            alert("Failed to delete exercise")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Link
                href={`/admin/exercises/${exercise.id}/edit`}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit"
            >
                <Edit className="h-4 w-4" />
            </Link>

            <button
                onClick={handleDelete}
                disabled={isLoading}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    )
}
