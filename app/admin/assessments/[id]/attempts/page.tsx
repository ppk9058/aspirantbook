import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react"
import Image from "next/image"

interface AssessmentAttemptsPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function AssessmentAttemptsPage({ params }: AssessmentAttemptsPageProps) {
    const { id } = await params
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
        redirect("/")
    }

    const assessment = await prisma.assessment.findUnique({
        where: { id: id },
        select: { title: true },
    })

    if (!assessment) {
        notFound()
    }

    const attempts = await prisma.assessmentAttempt.findMany({
        where: { assessmentId: id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
            },
        },
        orderBy: {
            startedAt: "desc",
        },
    })

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/assessments"
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Attempts: {assessment.title}
                    </h1>
                    <p className="text-gray-600">
                        {attempts.length} total attempts
                    </p>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                    {attempts.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No attempts recorded yet.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left py-3 px-6 font-medium text-gray-700">Student</th>
                                    <th className="text-center py-3 px-6 font-medium text-gray-700">Score</th>
                                    <th className="text-center py-3 px-6 font-medium text-gray-700">Status</th>
                                    <th className="text-center py-3 px-6 font-medium text-gray-700">Time Spent</th>
                                    <th className="text-right py-3 px-6 font-medium text-gray-700">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map((attempt) => (
                                    <tr key={attempt.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {attempt.user.image ? (
                                                    <Image
                                                        src={attempt.user.image}
                                                        alt={attempt.user.name || ""}
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                                        {attempt.user.name?.[0] || "U"}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{attempt.user.name}</p>
                                                    <p className="text-xs text-gray-500">{attempt.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="font-bold text-gray-900">{attempt.score}%</span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${attempt.passed
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                                }`}>
                                                {attempt.passed ? (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                    <XCircle className="h-3 w-3" />
                                                )}
                                                {attempt.passed ? "Passed" : "Failed"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center text-gray-600 text-sm">
                                            {formatDuration(attempt.timeSpent)}
                                        </td>
                                        <td className="py-4 px-6 text-right text-gray-600 text-sm">
                                            {new Date(attempt.startedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
