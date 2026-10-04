"use client"

import React, { useState, useEffect } from "react"
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  Trophy,
  RotateCcw,
} from "lucide-react"
import type { LiveAssessment } from "@/lib/classroom-service"

interface LiveAssessmentPanelProps {
  assessment: LiveAssessment
  onComplete?: (score: number) => void
}

export default function LiveAssessmentPanel({
  assessment,
  onComplete,
}: LiveAssessmentPanelProps) {
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState(assessment.durationSeconds || 240)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsSubmitted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isSubmitted, timeLeft])

  const questions = assessment.questions || []
  const currentQ = questions[currentQIndex]

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitted) return
    setUserAnswers({ ...userAnswers, [currentQIndex]: optionIndex })
  }

  const handleSubmit = () => {
    setIsSubmitted(true)
    let correctCount = 0
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) correctCount++
    })
    if (onComplete) onComplete(correctCount)
  }

  // Calculate score
  let correctCount = 0
  questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctAnswer) correctCount++
  })

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = Math.floor(secs % 60)
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`
  }

  // Results View
  if (isSubmitted) {
    return (
      <div className="flex flex-col h-full bg-[#0D1527] text-white p-5 overflow-y-auto space-y-6">
        <div className="text-center py-4 bg-[#142038] rounded-3xl border border-gray-700/80 p-6 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <Trophy className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-black text-white">Quiz Completed!</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black text-[#F26522]">{correctCount}</span>
            <span className="text-xl font-bold text-gray-400">/ {questions.length}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800 text-center">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Accuracy</span>
              <span className="text-xs font-black text-emerald-400">
                {Math.round((correctCount / questions.length) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Class Avg</span>
              <span className="text-xs font-black text-gray-300">3.4 / 5</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Rank</span>
              <span className="text-xs font-black text-purple-400">Top 15%</span>
            </div>
          </div>
        </div>

        {/* Mini Leaderboard */}
        <div className="p-4 bg-[#131C31] rounded-2xl border border-gray-800 space-y-3">
          <h4 className="font-extrabold text-xs text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Award className="h-4 w-4 text-amber-400" />
            <span>Top Students in Live Class</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-gray-800/60 font-bold">
              <span className="text-amber-400">🥇 Aarav G.</span>
              <span className="text-gray-300 font-mono">5/5 &bull; 01:24</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-gray-800/40">
              <span className="text-gray-300">🥈 Sneha R.</span>
              <span className="text-gray-400 font-mono">5/5 &bull; 01:48</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-gray-800/40">
              <span className="text-gray-300">🥉 Devansh S.</span>
              <span className="text-gray-400 font-mono">4/5 &bull; 02:05</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#5B47FB]/20 border border-[#5B47FB]/40 font-bold text-[#5B47FB]">
              <span>#42 You (Student)</span>
              <span className="font-mono">{correctCount}/5</span>
            </div>
          </div>
        </div>

        {/* Retake Button */}
        <button
          onClick={() => {
            setIsSubmitted(false)
            setUserAnswers({})
            setTimeLeft(assessment.durationSeconds || 240)
            setCurrentQIndex(0)
          }}
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retake Mini Quiz</span>
        </button>
      </div>
    )
  }

  // Active Quiz View
  return (
    <div className="flex flex-col h-full bg-[#0D1527] text-white p-4 overflow-y-auto space-y-4">
      {/* Quiz Header & Timer */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            Live Assessment
          </span>
          <h3 className="font-extrabold text-xs text-white mt-1 truncate max-w-xs">
            {assessment.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs font-bold shrink-0">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-between gap-1.5 py-1">
        {questions.map((_, idx) => {
          const isAnswered = userAnswers[idx] !== undefined
          const isCurrent = currentQIndex === idx
          return (
            <button
              key={idx}
              onClick={() => setCurrentQIndex(idx)}
              className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                isCurrent
                  ? "bg-[#5B47FB] ring-2 ring-[#5B47FB]/50"
                  : isAnswered
                  ? "bg-emerald-500"
                  : "bg-gray-800"
              }`}
              title={`Question ${idx + 1}`}
            />
          )
        })}
      </div>

      {/* Current Question Body */}
      {currentQ && (
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Question {currentQIndex + 1} of {questions.length}
            </span>
            <p className="font-bold text-sm text-white leading-relaxed">
              {currentQ.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = userAnswers[currentQIndex] === oIdx
              return (
                <div
                  key={oIdx}
                  onClick={() => handleOptionSelect(oIdx)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? "border-[#5B47FB] bg-[#5B47FB]/20 text-white"
                      : "border-gray-800 bg-[#131C31] text-gray-300 hover:border-gray-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? "border-[#5B47FB] bg-[#5B47FB]" : "border-gray-600"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="leading-snug">{opt}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-auto">
        <button
          onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
          disabled={currentQIndex === 0}
          className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {currentQIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQIndex(currentQIndex + 1)}
            className="px-4 py-2 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  )
}
