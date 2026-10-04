"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, Award, RotateCcw, ArrowRight, BookOpen, Check, X } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

interface QuestionBreakdownItem {
    questionId: string
    question: string
    options: string[]
    userAnswerIndex: string | null
    userAnswerText: string
    correctAnswerIndex: string
    correctAnswerText: string
    isCorrect: boolean
    explanation: string
}

interface AssessmentResultsProps {
    assessmentId: string
    score: number
    passed: boolean
    timeSpent: number
    xpEarned: number
    totalQuestions: number
    correctAnswers: number
    attemptId?: string
}

export default function AssessmentResults({
    assessmentId,
    score: initialScore,
    passed: initialPassed,
    timeSpent: initialTimeSpent,
    xpEarned: initialXpEarned,
    totalQuestions: initialTotalQuestions,
    correctAnswers: initialCorrectAnswers,
    attemptId,
}: AssessmentResultsProps) {
    const router = useRouter()

    const [score, setScore] = useState(initialScore)
    const [passed, setPassed] = useState(initialPassed)
    const [timeSpent, setTimeSpent] = useState(initialTimeSpent)
    const [xpEarned, setXpEarned] = useState(initialXpEarned)
    const [totalQuestions, setTotalQuestions] = useState(initialTotalQuestions)
    const [correctAnswers, setCorrectAnswers] = useState(initialCorrectAnswers)
    const [breakdown, setBreakdown] = useState<QuestionBreakdownItem[]>([])

    // Load actual attempt breakdown from localStorage if available
    useEffect(() => {
        if (typeof window !== "undefined" && attemptId) {
            try {
                const stored = localStorage.getItem(`assessment_result_${attemptId}`)
                if (stored) {
                    const parsed = JSON.parse(stored)
                    if (parsed && typeof parsed.score === "number") {
                        setScore(parsed.score)
                        setPassed(parsed.passed)
                        if (parsed.timeSpent) setTimeSpent(parsed.timeSpent)
                        setTotalQuestions(parsed.totalQuestions || 5)
                        setCorrectAnswers(parsed.correctAnswers ?? 0)
                        setXpEarned(parsed.passed ? (parsed.correctAnswers || 0) * 20 : 10)
                        if (Array.isArray(parsed.breakdown)) {
                            setBreakdown(parsed.breakdown)
                        }
                    }
                }
            } catch (e) {
                console.warn("Error reading stored assessment attempt:", e)
            }
        }
    }, [attemptId])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs}s`
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">
            {/* Top Pass/Fail Status Banner */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-3"
            >
                <div className={`inline-flex items-center justify-center p-4 rounded-3xl shadow-sm mb-2 ${
                    passed ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>
                    {passed ? (
                        <CheckCircle2 className="h-14 w-14 stroke-[2.5]" />
                    ) : (
                        <XCircle className="h-14 w-14 stroke-[2.5]" />
                    )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                    {passed ? "Assessment Passed!" : "Assessment Needs Practice"}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
                    {passed
                        ? "Outstanding work! You demonstrated solid mastery across core questions."
                        : "Good effort! Review the detailed solutions below and retake the test to score 100%."}
                </p>
            </motion.div>

            {/* Performance Stats Cards */}
            <Card className="rounded-3xl border border-gray-200/90 shadow-xs overflow-hidden bg-white">
                <div className={`h-2.5 w-full ${passed ? "bg-emerald-500" : "bg-red-500"}`} />
                <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Score</p>
                            <p className={`text-3xl font-black ${passed ? "text-emerald-600" : "text-red-600"}`}>
                                {score}%
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Correct</p>
                            <p className="text-3xl font-black text-gray-900">
                                {correctAnswers} / {totalQuestions}
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time Taken</p>
                            <p className="text-2xl font-black text-gray-900 mt-0.5">
                                {formatTime(timeSpent)}
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl text-center border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">XP Earned</p>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                <Award className="h-6 w-6 text-amber-500" />
                                <span className="text-2xl font-black text-gray-900">+{xpEarned}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Question Review Breakdown */}
            {breakdown.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-[#5B47FB]" />
                            <span>Detailed Answer Solutions</span>
                        </h2>
                        <span className="text-xs text-gray-500 font-medium">
                            {correctAnswers} of {totalQuestions} correct
                        </span>
                    </div>

                    <div className="space-y-4">
                        {breakdown.map((item, index) => (
                            <div
                                key={item.questionId}
                                className={`p-5 rounded-2xl border transition-all bg-white ${
                                    item.isCorrect
                                        ? "border-emerald-200 bg-emerald-50/20"
                                        : "border-red-200 bg-red-50/20"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                                        <span className="text-[#5B47FB] mr-2">Q{index + 1}.</span>
                                        {item.question}
                                    </h3>
                                    {item.isCorrect ? (
                                        <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                            Correct (+20 pts)
                                        </span>
                                    ) : (
                                        <span className="shrink-0 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <X className="h-3.5 w-3.5 stroke-[3]" />
                                            Incorrect
                                        </span>
                                    )}
                                </div>

                                {/* Answers comparison */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                                    <div className={`p-2.5 rounded-xl border ${
                                        item.isCorrect
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                            : "border-red-200 bg-red-50 text-red-900"
                                    }`}>
                                        <span className="font-bold block text-[10px] uppercase tracking-wider opacity-70">
                                            Your Answer:
                                        </span>
                                        <span className="font-semibold">{item.userAnswerText}</span>
                                    </div>

                                    <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                                        <span className="font-bold block text-[10px] uppercase tracking-wider opacity-70">
                                            Correct Solution:
                                        </span>
                                        <span className="font-semibold">{item.correctAnswerText}</span>
                                    </div>
                                </div>

                                {/* Explanation */}
                                {item.explanation && (
                                    <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 leading-relaxed">
                                        <strong className="text-gray-900">Explanation: </strong>
                                        {item.explanation}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push(`/assessments/${assessmentId}`)}
                    className="gap-2 rounded-xl font-bold cursor-pointer hover:bg-gray-100"
                >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retake Assessment</span>
                </Button>
                <Link
                    href="/assessments"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5B47FB] hover:bg-[#4a36ea] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg cursor-pointer text-sm"
                >
                    <span>Explore All Mock Tests</span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    )
}
