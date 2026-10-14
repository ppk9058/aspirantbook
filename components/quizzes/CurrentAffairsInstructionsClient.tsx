"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { ArrowLeft, ChevronRight, User, AlertCircle, Clock, FileQuestion, Award } from "lucide-react"

interface Props {
  quiz: {
    id: string
    title: string
    titleHi?: string | null
    durationMinutes: number
    totalQuestions: number
    totalMarks: number
    positiveMarks: number
    negativeMarks: number
  }
  slug: string
  returnPath: string
  isGuest?: boolean
  userName?: string
}

export default function CurrentAffairsInstructionsClient({
  quiz,
  slug,
  returnPath,
  isGuest: propIsGuest,
  userName,
}: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()

  const isActuallyGuest = propIsGuest !== undefined ? propIsGuest : !session?.user
  const candidateName =
    session?.user?.name ||
    userName ||
    (session?.user?.email ? session.user.email.split("@")[0] : "Student")
  const declarationHref = `/test-series/current-affairs-system-series/declaration?testId=${encodeURIComponent(quiz.id)}&returnPath=${encodeURIComponent(returnPath)}`

  const handleNextClick = (e: React.MouseEvent) => {
    if (isActuallyGuest) {
      e.preventDefault()
      openMobileAuth({
        actionType: "login",
        callbackUrl: declarationHref,
      })
    }
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full flex flex-col bg-white overflow-hidden text-gray-800">
      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-200 bg-white shrink-0 min-h-[56px]">
        {/* Brand Logo + Quiz Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 shrink-0 hover:opacity-90">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shadow-xs">
              <span className="text-white text-[10px] font-black">TS</span>
            </div>
            <span className="text-teal-700 font-black text-sm hidden sm:inline">aspirantbook</span>
          </Link>
          <div className="w-px h-5 bg-gray-300 shrink-0" />
          <span className="text-gray-900 text-xs sm:text-sm font-bold truncate max-w-[170px] sm:max-w-md">
            {quiz.title}
          </span>
        </div>

        {/* Candidate Profile Info */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white/80">
            <User className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-gray-700 hidden xs:inline truncate max-w-[120px]">
            {candidateName}
          </span>
        </div>
      </header>

      {/* ── MAIN INSTRUCTIONS BODY ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            General Test Instructions
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Please read the instructions carefully before proceeding to the declaration.
          </p>
        </div>

        {/* Key Metrics Quick Ribbon */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100 text-center">
          <div>
            <span className="text-xs sm:text-sm font-black text-teal-900">{quiz.totalQuestions}</span>
            <p className="text-[10px] sm:text-xs text-teal-700 font-semibold uppercase">Questions</p>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black text-teal-900">{quiz.durationMinutes} mins</span>
            <p className="text-[10px] sm:text-xs text-teal-700 font-semibold uppercase">Total Time</p>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black text-teal-900">{quiz.totalMarks} Marks</span>
            <p className="text-[10px] sm:text-xs text-teal-700 font-semibold uppercase">Max Score</p>
          </div>
        </div>

        {/* Detailed Instructions Text */}
        <div className="text-xs sm:text-sm text-gray-700 space-y-4 leading-relaxed bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-2xs">
          <p className="font-bold text-gray-900">1. General Information & Clock:</p>
          <ul className="list-disc ml-5 space-y-1.5 text-gray-600">
            <li>The clock will be set at the server. The countdown timer in the top right corner of the screen will display the remaining time available for you to complete the examination.</li>
            <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
          </ul>

          <p className="font-bold text-gray-900 mt-4">2. Question Palette & Answering Status:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
              <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <span>You have not visited the question yet.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <span>You have not answered the question.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
              <span>You have answered the question.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
              <span>Marked for review and not answered.</span>
            </div>
          </div>

          <p className="font-bold text-gray-900 mt-4">3. Marking & Evaluation:</p>
          <ul className="list-disc ml-5 space-y-1.5 text-gray-600">
            <li>Each correct answer carries <strong>+{quiz.positiveMarks}</strong> mark(s).</li>
            <li>Each wrong answer carries a negative penalty of <strong>-{quiz.negativeMarks}</strong> mark(s).</li>
            <li>No marks are deducted for unattempted questions.</li>
          </ul>

          <p className="font-bold text-gray-900 mt-4">4. Language & Navigation:</p>
          <ul className="list-disc ml-5 space-y-1.5 text-gray-600">
            <li>You can toggle between English and Hindi for individual questions or the full test.</li>
            <li>To deselect your chosen answer, click on the chosen option again or click on <strong>Clear Response</strong>.</li>
            <li>To save your answer, you MUST click on <strong>Save & Next</strong>.</li>
          </ul>
        </div>
      </div>

      {/* ── BOTTOM ACTIONS BAR ─────────────────────────────── */}
      <footer
        className="flex items-center justify-between px-4 sm:px-8 py-3 border-t border-gray-200 bg-gray-50 shrink-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => router.push(returnPath)}
          className="min-h-[44px] px-3.5 py-2 flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Quizzes</span>
        </button>

        <Link
          href={declarationHref}
          onClick={handleNextClick}
          className="min-h-[44px] px-7 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </footer>
    </div>
  )
}
