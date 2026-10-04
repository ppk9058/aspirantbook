"use client"

import { useState } from "react"
import Editor from "@/components/editor/LazyMonacoEditor"

interface CodeQuestionProps {
    question: {
        question: string
    }
    answer?: string
    onAnswerChange: (answer: string) => void
}

export default function CodeQuestion({ question, answer, onAnswerChange }: CodeQuestionProps) {
    return (
        <div className="space-y-6">
            <div className="prose prose-sm max-w-none">
                <p className="text-lg text-gray-900 whitespace-pre-wrap">{question.question}</p>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-700">
                    <span className="text-sm text-gray-300">Your Code</span>
                </div>
                <Editor
                    height="300px"
                    language="python"
                    value={answer || ""}
                    onChange={(value) => onAnswerChange(value || "")}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                    }}
                />
            </div>
        </div>
    )
}
