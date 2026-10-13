"use client"

import { useState } from "react"
import { QuestionType } from "@prisma/client"
import { Trash2, GripVertical, Plus, X } from "lucide-react"
import Editor from "@/components/editor/LazyMonacoEditor"

interface QuestionInput {
    type: QuestionType
    question: string
    options?: string[]
    correctAnswer: string
    explanation?: string
    points: number
    order: number
}

interface QuestionEditorProps {
    question: QuestionInput
    index: number
    onChange: (index: number, data: QuestionInput) => void
    onRemove: (index: number) => void
}

export default function QuestionEditor({ question, index, onChange, onRemove }: QuestionEditorProps) {
    const [activeTab, setActiveTab] = useState<"content" | "settings">("content")

    const handleTypeChange = (type: QuestionType) => {
        onChange(index, {
            ...question,
            type,
            options: type === "MULTIPLE_CHOICE" ? ["", "", "", ""] : undefined,
            correctAnswer: type === "MULTIPLE_CHOICE" ? "0" : ""
        })
    }

    const handleOptionChange = (optIndex: number, value: string) => {
        const currentOptions = question.options || ["", "", "", ""]
        const newOptions = [...currentOptions]
        newOptions[optIndex] = value
        onChange(index, { ...question, options: newOptions })
    }

    const addOption = () => {
        const currentOptions = question.options || []
        onChange(index, { ...question, options: [...currentOptions, ""] })
    }

    const removeOption = (optIndex: number) => {
        const currentOptions = question.options || []
        const newOptions = currentOptions.filter((_, i) => i !== optIndex)
        onChange(index, { ...question, options: newOptions })
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                    <span className="font-medium text-gray-700">Question {index + 1}</span>
                    <select
                        value={question.type}
                        onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                        className="text-sm border-gray-300 rounded-md focus:ring-[#1448d8] focus:border-[#1448d8]"
                    >
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="CODE_COMPLETION">Code Completion</option>
                        <option value="FILL_BLANK">Fill in the Blank</option>
                        <option value="CODE_OUTPUT">Output Prediction</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={question.points}
                        onChange={(e) => onChange(index, { ...question, points: parseInt(e.target.value) || 0 })}
                        className="w-20 text-sm border-gray-300 rounded-md focus:ring-[#1448d8] focus:border-[#1448d8]"
                        placeholder="Points"
                    />
                    <span className="text-sm text-gray-500">pts</span>
                    <button
                        onClick={() => onRemove(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                    <textarea
                        value={question.question}
                        onChange={(e) => onChange(index, { ...question, question: e.target.value })}
                        rows={3}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                        placeholder="Enter your question here..."
                    />
                </div>

                {question.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Options</label>
                        {(question.options || ["", "", "", ""]).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={`correct-${index}`}
                                    checked={question.correctAnswer === String(optIndex)}
                                    onChange={() => onChange(index, { ...question, correctAnswer: String(optIndex) })}
                                    className="text-[#1448d8] focus:ring-[#1448d8]"
                                />
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                                    placeholder={`Option ${optIndex + 1}`}
                                />
                                <button
                                    onClick={() => removeOption(optIndex)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={addOption}
                            className="text-sm text-[#1448d8] hover:text-[#0f37a8] font-medium flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" /> Add Option
                        </button>
                    </div>
                )}

                {question.type === "CODE_COMPLETION" && (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Correct Code Solution</label>
                        <div className="border border-gray-300 rounded-md overflow-hidden h-64">
                            <Editor
                                height="100%"
                                defaultLanguage="python"
                                value={question.correctAnswer}
                                onChange={(value) => onChange(index, { ...question, correctAnswer: value || "" })}
                                theme="vs-light"
                                options={{ minimap: { enabled: false }, fontSize: 14 }}
                            />
                        </div>
                    </div>
                )}

                {(question.type === "FILL_BLANK" || question.type === "CODE_OUTPUT") && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                        <input
                            type="text"
                            value={question.correctAnswer}
                            onChange={(e) => onChange(index, { ...question, correctAnswer: e.target.value })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                            placeholder="Enter the exact correct answer"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (Optional)</label>
                    <textarea
                        value={question.explanation || ""}
                        onChange={(e) => onChange(index, { ...question, explanation: e.target.value })}
                        rows={2}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1448d8] focus:ring-[#1448d8]"
                        placeholder="Explain why this is the correct answer..."
                    />
                </div>
            </div>
        </div>
    )
}
