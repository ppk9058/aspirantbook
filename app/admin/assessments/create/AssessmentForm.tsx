"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Difficulty, QuestionType } from "@prisma/client"
import { Plus, Save, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import QuestionEditor from "@/components/admin/assessment/QuestionEditor"
import { createAssessment, updateAssessment } from "@/lib/actions/admin/assessments"

interface QuestionInput {
    type: QuestionType
    question: string
    options?: string[]
    correctAnswer: string
    explanation?: string
    points: number
    order: number
}

interface AssessmentFormProps {
    initialData?: {
        id: string
        title: string
        slug: string
        description?: string | null
        technology: string
        difficulty: Difficulty
        duration: number
        passingScore: number
        questions: any[]
    }
}

export default function AssessmentForm({ initialData }: AssessmentFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        description: initialData?.description || "",
        technology: initialData?.technology || "Python",
        difficulty: initialData?.difficulty || "BEGINNER",
        duration: initialData?.duration || 30,
        passingScore: initialData?.passingScore || 70,
    })

    const [questions, setQuestions] = useState<QuestionInput[]>(
        initialData?.questions.map(q => ({
            ...q,
            options: q.options as string[] | undefined
        })) || []
    )

    const handleQuestionChange = (index: number, data: QuestionInput) => {
        const newQuestions = [...questions]
        newQuestions[index] = data
        setQuestions(newQuestions)
    }

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                type: "MULTIPLE_CHOICE",
                question: "",
                options: ["", "", "", ""],
                correctAnswer: "0",
                points: 10,
                order: questions.length + 1,
            },
        ])
    }

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index))
    }

    const handleSubmit = async (publish = false) => {
        if (!formData.title) return alert("Title is required")
        if (questions.length === 0) return alert("Add at least one question")

        setIsLoading(true)

        try {
            const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

            const data = {
                ...formData,
                slug: initialData?.slug || slug,
                questions: questions.map((q, i) => ({ ...q, order: i + 1 })),
            }

            if (initialData) {
                await updateAssessment(initialData.id, data)
            } else {
                await createAssessment(data, publish)
            }

            router.push("/admin/assessments")
            router.refresh()
        } catch (error) {
            console.error("Failed to save assessment:", error)
            alert("Failed to save assessment")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/assessments"
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {initialData ? "Edit Assessment" : "Create Assessment"}
                        </h1>
                        <p className="text-gray-600">
                            {initialData ? "Update assessment details and questions" : "Add a new assessment to the platform"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1448d8] hover:bg-[#0f37a8] text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {initialData ? "Update Assessment" : "Publish Assessment"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                placeholder="e.g., Python Basics Final Exam"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                placeholder="Brief description of what this assessment covers..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
                                <select
                                    value={formData.technology}
                                    onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                >
                                    <option value="Python">Python</option>
                                    <option value="JavaScript">JavaScript</option>
                                    <option value="React">React</option>
                                    <option value="SQL">SQL</option>
                                    <option value="HTML/CSS">HTML/CSS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                >
                                    <option value="BEGINNER">Beginner</option>
                                    <option value="INTERMEDIATE">Intermediate</option>
                                    <option value="ADVANCED">Advanced</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
                                <input
                                    type="number"
                                    value={formData.passingScore}
                                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Questions ({questions.length})</h2>
                            <button
                                onClick={addQuestion}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                            >
                                <Plus className="h-4 w-4" /> Add Question
                            </button>
                        </div>

                        {questions.map((question, index) => (
                            <QuestionEditor
                                key={index}
                                index={index}
                                question={question}
                                onChange={handleQuestionChange}
                                onRemove={removeQuestion}
                            />
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                                <p className="text-gray-500 mb-4">No questions added yet</p>
                                <button
                                    onClick={addQuestion}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1448d8] hover:bg-[#0f37a8] text-white rounded-lg transition-colors font-medium"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add First Question
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-24">
                        <h3 className="font-semibold text-gray-900 mb-4">Assessment Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Total Questions</span>
                                <span className="font-medium">{questions.length}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Total Points</span>
                                <span className="font-medium">
                                    {questions.reduce((sum, q) => sum + (q.points || 0), 0)}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Est. Duration</span>
                                <span className="font-medium">{formData.duration} mins</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Difficulty</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${formData.difficulty === "BEGINNER" ? "bg-green-100 text-green-700" :
                                        formData.difficulty === "INTERMEDIATE" ? "bg-yellow-100 text-yellow-700" :
                                            "bg-red-100 text-red-700"
                                    }`}>
                                    {formData.difficulty}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
