"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  PlusCircle,
  Trash2,
  CheckCircle2,
  FileQuestion,
  Sparkles,
  HelpCircle,
  Loader2,
  Send,
} from "lucide-react"

interface QuestionDraft {
  id: string
  question: string
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE"
  options: string[]
  correctIndex: number
  points: number
  explanation: string
}

export default function CreateTestPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("Python")
  const [duration, setDuration] = useState("30")
  const [passingScore, setPassingScore] = useState("70")
  const [difficulty, setDifficulty] = useState("INTERMEDIATE")

  // Question builder state
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: "q-1",
      question: "Which data structure in Python provides constant O(1) average time lookup?",
      type: "MULTIPLE_CHOICE",
      options: ["List", "Dictionary (Hash Map)", "Tuple", "Linked List"],
      correctIndex: 1,
      points: 20,
      explanation: "Python dictionaries are implemented via hash tables, allowing O(1) average lookup.",
    },
  ])

  const [curQuestion, setCurQuestion] = useState("")
  const [opt0, setOpt0] = useState("")
  const [opt1, setOpt1] = useState("")
  const [opt2, setOpt2] = useState("")
  const [opt3, setOpt3] = useState("")
  const [correctIndex, setCorrectIndex] = useState(0)
  const [explanation, setExplanation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleAddQuestion = () => {
    if (!curQuestion.trim() || !opt0.trim() || !opt1.trim()) return

    const newQ: QuestionDraft = {
      id: `q-${Date.now()}`,
      question: curQuestion.trim(),
      type: "MULTIPLE_CHOICE",
      options: [opt0.trim(), opt1.trim(), opt2.trim() || "N/A", opt3.trim() || "N/A"],
      correctIndex,
      points: 20,
      explanation: explanation.trim(),
    }

    setQuestions([...questions, newQ])
    setCurQuestion("")
    setOpt0("")
    setOpt1("")
    setOpt2("")
    setOpt3("")
    setCorrectIndex(0)
    setExplanation("")
  }

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const handlePublishTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (questions.length === 0) {
      alert("Please add at least one question.")
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
      setTimeout(() => {
        router.push("/assessments")
      }, 1500)
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Teacher Dashboard</span>
      </Link>

      <div className="bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 text-xs font-bold">
            Assessment & CBT Authoring
          </span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            Create Online Assessment / Test
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Build graded quizzes, CBT mock tests, and concept diagnostic benchmarks for students.
          </p>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Assessment Published Successfully!
            </h3>
            <p className="text-xs text-gray-500">
              Your test is now live in the student assessment catalog. Redirecting...
            </p>
          </div>
        ) : (
          <form onSubmit={handlePublishTest} className="space-y-6">
            {/* Meta Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit Test: Python OOPs & Collections"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Subject / Technology
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                >
                  <option value="Python">Python</option>
                  <option value="Science">Science & Physics</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Data Structures">Data Structures</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center justify-between">
                <span>Configured Questions ({questions.length})</span>
                <span className="text-xs text-gray-400 font-normal">
                  Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}
                </span>
              </h3>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-2 relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        Q{idx + 1}. {q.question}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-lg border ${
                            i === q.correctIndex
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-semibold"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {i + 1}) {opt} {i === q.correctIndex && "✓ (Correct)"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Builder Box */}
            <div className="p-5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-4">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Add New Question
              </h4>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Question Text
                </label>
                <input
                  type="text"
                  placeholder="Enter question statement..."
                  value={curQuestion}
                  onChange={(e) => setCurQuestion(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Option 1
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1"
                    value={opt0}
                    onChange={(e) => setOpt0(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Option 2
                  </label>
                  <input
                    type="text"
                    placeholder="Option 2"
                    value={opt1}
                    onChange={(e) => setOpt1(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Option 3
                  </label>
                  <input
                    type="text"
                    placeholder="Option 3"
                    value={opt2}
                    onChange={(e) => setOpt2(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Option 4
                  </label>
                  <input
                    type="text"
                    placeholder="Option 4"
                    value={opt3}
                    onChange={(e) => setOpt3(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Correct Option
                  </label>
                  <select
                    value={correctIndex}
                    onChange={(e) => setCorrectIndex(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value={0}>Option 1</option>
                    <option value={1}>Option 2</option>
                    <option value={2}>Option 3</option>
                    <option value={3}>Option 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Pedagogical Explanation
                  </label>
                  <input
                    type="text"
                    placeholder="Why is this option correct?"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
              >
                + Append Question to Test
              </button>
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              <Link
                href="/teacher"
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || questions.length === 0 || !title.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold shadow-md shadow-[#3AAFA9]/20 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Publish Assessment
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
