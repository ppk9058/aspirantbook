"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, AlertCircle, LayoutGrid, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import MCQQuestion from "./MCQQuestion"
import CodeQuestion from "./CodeQuestion"
import FillBlankQuestion from "./FillBlankQuestion"
import OutputQuestion from "./OutputQuestion"
import { evaluateAssessment, type AssessmentQuestion } from "@/lib/assessments-data"

interface AssessmentInterfaceProps {
    attemptId: string
    questions: AssessmentQuestion[]
    duration: number
    endTime?: Date | string
    assessmentId?: string
}

export default function AssessmentInterface({
    attemptId,
    questions,
    duration = 15,
    assessmentId = "test-assessment-1",
}: AssessmentInterfaceProps) {
    const router = useRouter()
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [timeLeft, setTimeLeft] = useState<number>(() => Math.max(60, (duration || 15) * 60))
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [showMobileNav, setShowMobileNav] = useState(false)
    const answersRef = useRef<Record<string, string>>({})
    answersRef.current = answers

    // Safe submission handler
    const performSubmit = useCallback(async (finalAnswers: Record<string, string>) => {
        if (isSubmitting) return
        setIsSubmitting(true)

        // Evaluate user score immediately
        const evaluation = evaluateAssessment(finalAnswers, questions)
        const timeSpent = Math.max(1, ((duration || 15) * 60) - timeLeft)

        const resultPayload = {
            ...evaluation,
            timeSpent,
            attemptId,
            assessmentId,
            submittedAt: new Date().toISOString(),
        }

        // Cache evaluation in localStorage for instant retrieval on results page
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(`assessment_result_${attemptId}`, JSON.stringify(resultPayload))
            }
        } catch (e) {
            console.warn("Could not save to localStorage:", e)
        }

        // Attempt server sync
        try {
            const response = await fetch(`/api/assessments/attempts/${attemptId}/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ answers: finalAnswers }),
            })

            const data = await response.json()
            const targetId = data?.assessmentId || assessmentId
            router.push(`/assessments/${targetId}/results?attemptId=${attemptId}`)
        } catch {
            // Fallback router navigation even if network/db fails
            router.push(`/assessments/${assessmentId}/results?attemptId=${attemptId}`)
        }
    }, [isSubmitting, questions, duration, timeLeft, attemptId, assessmentId, router])

    // Mount verification to prevent instant zero-second auto-submits
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Smooth countdown timer that only submits after counting down to zero
    useEffect(() => {
        if (!isMounted) return

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    performSubmit(answersRef.current)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isMounted, performSubmit])

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }))
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1)
        }
    }

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1)
        }
    }

    const handleQuestionSelect = (index: number) => {
        setCurrentQuestionIndex(index)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const currentQuestion = questions[currentQuestionIndex] || questions[0]
    const answeredCount = Object.keys(answers).length
    const isLastQuestion = currentQuestionIndex === questions.length - 1
    const isTimeRunningOut = timeLeft < 180 // Less than 3 minutes

    if (!currentQuestion) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p>No questions found in this assessment.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-gray-50">
            {/* Mobile-Only Sticky Header */}
            <div className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-[#5B47FB] bg-[#5B47FB]/10 px-2.5 py-1 rounded-lg">
                        Q {currentQuestionIndex + 1}/{questions.length}
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowMobileNav(true)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                    >
                        <LayoutGrid className="w-3.5 h-3.5 text-[#5B47FB]" />
                        <span>Grid ({answeredCount}/{questions.length})</span>
                    </button>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                    isTimeRunningOut
                        ? "bg-red-50 text-red-700 animate-pulse border border-red-200"
                        : "bg-[#F0FDF4] text-emerald-800 border border-emerald-200"
                }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Mobile Sheet / Drawer for Question Navigator */}
            {showMobileNav && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
                    <div className="bg-white rounded-t-2xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-[#5B47FB]" />
                                <h3 className="font-bold text-sm text-gray-900">Question Navigator</h3>
                                <span className="text-xs text-gray-500 font-medium">({answeredCount}/{questions.length} answered)</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMobileNav(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                                aria-label="Close question navigator"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, index) => {
                                    const isCurrent = index === currentQuestionIndex
                                    const isAnswered = answers[q.id] !== undefined
                                    return (
                                        <button
                                            key={q.id}
                                            type="button"
                                            onClick={() => {
                                                handleQuestionSelect(index)
                                                setShowMobileNav(false)
                                            }}
                                            className={`h-11 rounded-xl font-bold text-sm transition-all flex items-center justify-center relative active:scale-95 ${
                                                isCurrent
                                                    ? "bg-[#5B47FB] text-white shadow-md ring-2 ring-[#5B47FB]/30 scale-105"
                                                    : isAnswered
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-gray-100 text-gray-600"
                                            }`}
                                        >
                                            <span>{index + 1}</span>
                                            {isAnswered && !isCurrent && (
                                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 safe-area-bottom">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMobileNav(false)
                                    performSubmit(answers)
                                }}
                                disabled={isSubmitting}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Flag className="h-4 w-4" />
                                <span>{isSubmitting ? "Submitting..." : "Submit Assessment"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop-Only Permanent Left Sidebar */}
            <div className="hidden md:flex md:w-72 bg-white border-r border-gray-200 flex-col justify-between shrink-0">
                <div>
                    {/* Timer Widget */}
                    <div className="p-5 border-b border-gray-200">
                        <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                            isTimeRunningOut
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-[#F0FDF4] border-emerald-200 text-emerald-800"
                        }`}>
                            <Clock className={`h-6 w-6 ${isTimeRunningOut ? "text-red-600 animate-pulse" : "text-emerald-600"}`} />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                                    Time Remaining
                                </p>
                                <p className="text-2xl font-black font-mono tracking-tight">
                                    {formatTime(timeLeft)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Question Status Grid */}
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-700">Question Navigator</span>
                            <span className="text-xs text-gray-500 font-medium">
                                <strong className="text-gray-900">{answeredCount}</strong> of {questions.length} answered
                            </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2.5">
                            {questions.map((q, index) => {
                                const isCurrent = index === currentQuestionIndex
                                const isAnswered = answers[q.id] !== undefined

                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => handleQuestionSelect(index)}
                                        className={`h-11 rounded-xl font-bold text-sm transition-all flex items-center justify-center relative cursor-pointer ${
                                            isCurrent
                                                ? "bg-[#5B47FB] text-white shadow-md ring-2 ring-[#5B47FB]/30 scale-105"
                                                : isAnswered
                                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        <span>{index + 1}</span>
                                        {isAnswered && !isCurrent && (
                                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Submit Assessment Button in Sidebar */}
                <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={() => performSubmit(answers)}
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <Flag className="h-4 w-4" />
                        <span>{isSubmitting ? "Submitting..." : "Submit Assessment"}</span>
                    </button>
                    <p className="text-[11px] text-gray-400 text-center mt-2">
                        You can review and change answers anytime before submitting.
                    </p>
                </div>
            </div>

            {/* Main Content Area - Question & Options */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Header meta */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-[#5B47FB] uppercase tracking-wider">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full font-medium">
                                    {currentQuestion.points} points
                                </span>
                                {answers[currentQuestion.id] !== undefined ? (
                                    <span className="text-xs text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Answered
                                    </span>
                                ) : (
                                    <span className="text-xs text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-semibold">
                                        Unanswered
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-32 hidden sm:block">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#5B47FB] transition-all duration-300"
                                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Question Card */}
                    <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-6 sm:p-8">
                            {currentQuestion.type === "MULTIPLE_CHOICE" && (
                                <MCQQuestion
                                    question={currentQuestion}
                                    answer={answers[currentQuestion.id]}
                                    onAnswerChange={(ans) => handleAnswerChange(currentQuestion.id, ans)}
                                />
                            )}
                            {currentQuestion.type === "CODE_COMPLETION" && (
                                <CodeQuestion
                                    question={currentQuestion}
                                    answer={answers[currentQuestion.id]}
                                    onAnswerChange={(ans) => handleAnswerChange(currentQuestion.id, ans)}
                                />
                            )}
                            {currentQuestion.type === "FILL_BLANK" && (
                                <FillBlankQuestion
                                    question={currentQuestion}
                                    answer={answers[currentQuestion.id]}
                                    onAnswerChange={(ans) => handleAnswerChange(currentQuestion.id, ans)}
                                />
                            )}
                            {currentQuestion.type === "CODE_OUTPUT" && (
                                <OutputQuestion
                                    question={currentQuestion}
                                    answer={answers[currentQuestion.id]}
                                    onAnswerChange={(ans) => handleAnswerChange(currentQuestion.id, ans)}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Bottom Question Controls (Sticky on mobile for effortless navigation) */}
                    <div className="sticky bottom-0 -mx-4 -mb-8 sm:mx-0 sm:mb-0 p-3 sm:p-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-gray-200 safe-area-bottom z-10 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] sm:shadow-none">
                        <button
                            type="button"
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {isLastQuestion ? (
                                <button
                                    type="button"
                                    onClick={() => performSubmit(answers)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                >
                                    <span>Submit Final Answers</span>
                                    <CheckCircle2 className="h-4 w-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4a36ea] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
