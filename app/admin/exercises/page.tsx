import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Code2, BookOpen, Edit, Trash2, MoreVertical } from "lucide-react"
import ExerciseActions from "./ExerciseActions"

import { getCurrentUserContext } from "@/lib/auth/rbac"

export default async function AdminExercisesPage() {
    const user = await getCurrentUserContext()

    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    const exercises = await prisma.exercise.findMany({
        include: {
            lesson: {
                select: {
                    title: true,
                    chapter: {
                        select: {
                            course: {
                                select: {
                                    title: true
                                }
                            }
                        }
                    }
                },
            },
            _count: {
                select: {
                    testCases: true,
                    submissions: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#10162F]">Coding Challenges & Exercises Studio</h1>
                    <p className="text-gray-600 mt-1 font-medium">Author interactive code challenges, test cases, and starter code ({exercises.length} total challenges)</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/tutorials"
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#3A10E5] rounded-xl border border-indigo-200 text-xs font-bold transition-all"
                    >
                        Looking for Text Tutorials? &rarr;
                    </Link>
                    <Link
                        href="/admin/exercises/create"
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#3A10E5] hover:bg-[#300ec2] text-white rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] transition-all font-bold text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        + Create Exercise
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                    {exercises.length === 0 ? (
                        <div className="text-center py-12">
                            <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">No exercises created yet</p>
                            <Link
                                href="/admin/exercises/create"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3AAFA9] hover:bg-[#2d8a85] text-white rounded-lg transition-colors font-medium"
                            >
                                <Plus className="h-4 w-4" />
                                Create First Exercise
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Language</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Difficulty</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Linked Lesson</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-700">Test Cases</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-700">Submissions</th>
                                        <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exercises.map((exercise) => (
                                        <tr key={exercise.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-4">
                                                <p className="font-medium text-gray-900">{exercise.title}</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                                                    {exercise.language}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-sm ${exercise.difficulty === "BEGINNER" ? "bg-green-100 text-green-700" :
                                                        exercise.difficulty === "INTERMEDIATE" ? "bg-yellow-100 text-yellow-700" :
                                                            "bg-red-100 text-red-700"
                                                    }`}>
                                                    {exercise.difficulty}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                {exercise.lesson ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <BookOpen className="h-4 w-4" />
                                                        <span>{exercise.lesson.title}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">Not linked</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center text-gray-900">
                                                {exercise._count.testCases}
                                            </td>
                                            <td className="py-4 px-4 text-center text-gray-900">
                                                {exercise._count.submissions}
                                            </td>
                                            <td className="py-4 px-4">
                                                <ExerciseActions exercise={exercise} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
