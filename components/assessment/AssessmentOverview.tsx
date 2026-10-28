"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, FileCheck, Award, AlertCircle } from "lucide-react"

interface Assessment {
    id: string
    title: string
    description: string | null
    duration: number
    passingScore: number
    technology: string
    attempts: Array<{
        id: string
        score: number
        passed: boolean
        startedAt: Date
        completedAt: Date | null
    }>
    _count: {
        questions: number
    }
}

interface AssessmentOverviewProps {
    assessment: Assessment
    userId: string
}

export default function AssessmentOverview({ assessment, userId }: AssessmentOverviewProps) {
    const router = useRouter()
    const [isStarting, setIsStarting] = useState(false)
    const [startError, setStartError] = useState<string | null>(null)

    const hasAttempted = assessment.attempts.length > 0
    const lastAttempt = hasAttempted ? assessment.attempts[0] : null

    const handleStartAssessment = async () => {
        setIsStarting(true)
        setStartError(null)

        try {
            // Create new attempt. The server is the only source of attempt ids:
            // never invent one client-side, that would serve a fabricated exam.
            const response = await fetch(`/api/assessments/${assessment.id}/start`, {
                method: "POST",
            })

            const data = await response.json().catch(() => null)

            if (!response.ok || !data?.attemptId) {
                setStartError(
                    data?.error || "We could not start this assessment. Please try again."
                )
                return
            }

            router.push(`/assessments/${assessment.id}/take?attemptId=${data.attemptId}`)
        } catch (error) {
            console.error("[assessment] Failed to start assessment", error)
            setStartError("Network error - we could not start this assessment. Please try again.")
        } finally {
            setIsStarting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <div className="text-sm text-gray-600 mb-2">{assessment.technology}</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessment.title}</h1>
                <p className="text-gray-600">{assessment.description}</p>
            </div>

            {/* Assessment Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <FileCheck className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Questions</p>
                                <p className="text-2xl font-bold text-gray-900">{assessment._count.questions}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-50 p-3 rounded-lg">
                                <Clock className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Duration</p>
                                <p className="text-2xl font-bold text-gray-900">{assessment.duration} min</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-50 p-3 rounded-lg">
                                <Award className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Passing Score</p>
                                <p className="text-2xl font-bold text-gray-900">{assessment.passingScore}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Previous Attempts */}
            {hasAttempted && (
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>Your Previous Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {assessment.attempts.map((attempt, index) => (
                                <div
                                    key={attempt.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            Attempt {assessment.attempts.length - index}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {new Date(attempt.startedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">{attempt.score}%</p>
                                        <p className={`text-sm font-medium ${attempt.passed ? "text-green-600" : "text-red-600"
                                            }`}>
                                            {attempt.passed ? "Passed" : "Failed"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-gray-700">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium">Time Limit</p>
                                <p className="text-sm text-gray-600">
                                    You have {assessment.duration} minutes to complete this assessment. The timer will start when you begin.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium">Passing Score</p>
                                <p className="text-sm text-gray-600">
                                    You need to score at least {assessment.passingScore}% to pass this assessment.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium">Question Types</p>
                                <p className="text-sm text-gray-600">
                                    This assessment may include multiple choice, code completion, fill-in-the-blank, and output prediction questions.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium">Auto-Submit</p>
                                <p className="text-sm text-gray-600">
                                    The assessment will be automatically submitted when time runs out.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Start Button */}
            <div className="flex flex-col items-center gap-3">
                {startError && (
                    <p role="alert" className="text-sm font-medium text-destructive text-center">
                        {startError}
                    </p>
                )}
                <button
                    onClick={handleStartAssessment}
                    disabled={isStarting}
                    className="px-8 py-3 bg-[#1448d8] hover:bg-[#0f37a8] text-white rounded-lg font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isStarting ? "Starting..." : hasAttempted ? "Retake Assessment" : "Start Assessment"}
                </button>
            </div>
        </div>
    )
}
