import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, FileCheck, Users, TrendingUp, Edit, Trash2, Eye } from "lucide-react"
import AssessmentActions from "./AssessmentActions"

export default async function AdminAssessmentsPage() {
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        redirect("/")
    }

    const assessments = await prisma.assessment.findMany({
        include: {
            _count: {
                select: {
                    questions: true,
                    attempts: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    })

    // Calculate stats
    const totalAssessments = assessments.length
    const publishedAssessments = assessments.filter(a => a.isPublished).length
    const totalAttempts = assessments.reduce((sum, a) => sum + a._count.attempts, 0)
    const totalQuestions = assessments.reduce((sum, a) => sum + a._count.questions, 0)

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
                    <p className="text-gray-600 mt-1">Manage assessments and monitor student performance</p>
                </div>
                <Link
                    href="/admin/assessments/create"
                    className="flex items-center gap-2 px-4 py-2 bg-[#3AAFA9] hover:bg-[#2d8a85] text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Create Assessment
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <FileCheck className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Assessments</p>
                                <p className="text-2xl font-bold text-gray-900">{totalAssessments}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-50 p-3 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Published</p>
                                <p className="text-2xl font-bold text-gray-900">{publishedAssessments}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-50 p-3 rounded-lg">
                                <Users className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Attempts</p>
                                <p className="text-2xl font-bold text-gray-900">{totalAttempts}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <FileCheck className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Questions</p>
                                <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assessments Table */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                    {assessments.length === 0 ? (
                        <div className="text-center py-12">
                            <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">No assessments created yet</p>
                            <Link
                                href="/admin/assessments/create"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#3AAFA9] hover:bg-[#2d8a85] text-white rounded-lg transition-colors font-medium"
                            >
                                <Plus className="h-4 w-4" />
                                Create Your First Assessment
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Technology</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-700">Difficulty</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-700">Questions</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-700">Attempts</th>
                                        <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                                        <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessments.map((assessment) => (
                                        <tr key={assessment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{assessment.title}</p>
                                                    <p className="text-sm text-gray-600">{assessment.duration} min • {assessment.passingScore}% passing</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                                    {assessment.technology}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-sm ${assessment.difficulty === "BEGINNER" ? "bg-green-100 text-green-700" :
                                                        assessment.difficulty === "INTERMEDIATE" ? "bg-yellow-100 text-yellow-700" :
                                                            "bg-red-100 text-red-700"
                                                    }`}>
                                                    {assessment.difficulty}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center text-gray-900">
                                                {assessment._count.questions}
                                            </td>
                                            <td className="py-4 px-4 text-center text-gray-900">
                                                {assessment._count.attempts}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`px-2 py-1 rounded text-sm font-medium ${assessment.isPublished
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                    {assessment.isPublished ? "Published" : "Draft"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <AssessmentActions assessment={assessment} />
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
