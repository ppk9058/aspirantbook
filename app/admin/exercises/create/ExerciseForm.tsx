"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Difficulty } from "@prisma/client"
import { Save, ArrowLeft, Loader2, Code2, BookOpen } from "lucide-react"
import Link from "next/link"
import Editor from "@/components/editor/LazyMonacoEditor"
import TestCaseEditor from "@/components/admin/exercise/TestCaseEditor"
import { createExercise, updateExercise } from "@/lib/actions/admin/exercises"

interface TestCase {
    input: string
    expectedOutput: string
    isHidden: boolean
}

interface ExerciseFormProps {
    initialData?: {
        id: string
        title: string
        slug: string
        description: string
        language: string
        difficulty: Difficulty
        starterCode: string | null
        solution: string | null
        hints: string[]
        lessonId: string | null
        testCases: TestCase[]
    }
    lessons: { id: string; title: string }[]
}

export default function ExerciseForm({ initialData, lessons }: ExerciseFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"details" | "code" | "tests">("details")

    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        description: initialData?.description || "",
        language: initialData?.language || "python",
        difficulty: initialData?.difficulty || "BEGINNER",
        lessonId: initialData?.lessonId || "",
        starterCode: initialData?.starterCode || "# Write your code here\n",
        solutionCode: initialData?.solution || "",
        hints: initialData?.hints || [],
    })

    const [testCases, setTestCases] = useState<TestCase[]>(initialData?.testCases || [])

    const handleSubmit = async () => {
        if (!formData.title) return alert("Title is required")
        if (testCases.length === 0) return alert("Add at least one test case")

        setIsLoading(true)

        try {
            const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

            const data = {
                ...formData,
                lessonId: formData.lessonId || undefined, // Handle empty string
                slug: initialData?.slug || slug,
                testCases,
            }

            if (initialData) {
                await updateExercise(initialData.id, data)
            } else {
                await createExercise(data)
            }

            router.push("/admin/exercises")
            router.refresh()
        } catch (error) {
            console.error("Failed to save exercise:", error)
            alert("Failed to save exercise")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-gray-50 py-4 z-10 border-b border-gray-200 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/exercises"
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {initialData ? "Edit Exercise" : "Create Exercise"}
                        </h1>
                        <p className="text-gray-600 text-sm">
                            {initialData ? "Update exercise details" : "Add a new coding challenge"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1448d8] hover:bg-[#0f37a8] text-white rounded-lg font-medium disabled:opacity-50 shadow-sm"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {initialData ? "Update Exercise" : "Create Exercise"}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 w-fit">
                <button
                    onClick={() => setActiveTab("details")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "details" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    Details
                </button>
                <button
                    onClick={() => setActiveTab("code")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "code" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    Code & Solution
                </button>
                <button
                    onClick={() => setActiveTab("tests")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "tests" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    Test Cases ({testCases.length})
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Details Tab */}
                    {activeTab === "details" && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                    placeholder="e.g., Sum of Two Numbers"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Markdown)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={8}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8] font-mono text-sm"
                                    placeholder="Describe the problem..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                    <select
                                        value={formData.language}
                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="sql">SQL</option>
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Lesson (Optional)</label>
                                <select
                                    value={formData.lessonId}
                                    onChange={(e) => setFormData({ ...formData, lessonId: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                >
                                    <option value="">-- Select a Lesson --</option>
                                    {lessons.map((lesson) => (
                                        <option key={lesson.id} value={lesson.id}>
                                            {lesson.title}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Linking to a lesson will make this exercise appear in the "Practice" tab for that lesson.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Code Tab */}
                    {activeTab === "code" && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Starter Code</label>
                                <div className="h-64 border border-gray-300 rounded-md overflow-hidden">
                                    <Editor
                                        height="100%"
                                        defaultLanguage={formData.language}
                                        value={formData.starterCode}
                                        onChange={(value) => setFormData({ ...formData, starterCode: value || "" })}
                                        theme="vs-light"
                                        options={{ minimap: { enabled: false }, fontSize: 14 }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">This code will be shown to the student initially.</p>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Solution</label>
                                <div className="h-64 border border-gray-300 rounded-md overflow-hidden">
                                    <Editor
                                        height="100%"
                                        defaultLanguage={formData.language}
                                        value={formData.solutionCode}
                                        onChange={(value) => setFormData({ ...formData, solutionCode: value || "" })}
                                        theme="vs-light"
                                        options={{ minimap: { enabled: false }, fontSize: 14 }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Used for validation and hints (hidden from student).</p>
                            </div>
                        </div>
                    )}

                    {/* Tests Tab */}
                    {activeTab === "tests" && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <TestCaseEditor testCases={testCases} onChange={setTestCases} />
                        </div>
                    )}
                </div>

                {/* Sidebar Preview */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-24">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Exercise Preview
                        </h3>

                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Title</span>
                                <p className="font-medium">{formData.title || "Untitled Exercise"}</p>
                            </div>

                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Language</span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                                    {formData.language}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Difficulty</span>
                                <span className={`px-2 py-1 rounded text-xs ${formData.difficulty === "BEGINNER" ? "bg-green-100 text-green-700" :
                                    formData.difficulty === "INTERMEDIATE" ? "bg-yellow-100 text-yellow-700" :
                                        "bg-red-100 text-red-700"
                                    }`}>
                                    {formData.difficulty}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Test Cases</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{testCases.length}</span>
                                    <span className="text-gray-400 text-xs">
                                        ({testCases.filter(tc => tc.isHidden).length} hidden)
                                    </span>
                                </div>
                            </div>

                            {formData.lessonId && (
                                <div className="pt-4 border-t border-gray-100">
                                    <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Linked To</span>
                                    <p className="text-gray-900">
                                        {lessons.find(l => l.id === formData.lessonId)?.title}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
