"use client"

interface OutputQuestionProps {
    question: {
        question: string
    }
    answer?: string
    onAnswerChange: (answer: string) => void
}

export default function OutputQuestion({ question, answer, onAnswerChange }: OutputQuestionProps) {
    return (
        <div className="space-y-6">
            <div className="prose prose-sm max-w-none">
                <p className="text-lg text-gray-900 whitespace-pre-wrap">{question.question}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Output
                </label>
                <textarea
                    value={answer || ""}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    placeholder="Enter the expected output..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3AAFA9] focus:border-transparent outline-none transition-all font-mono text-sm"
                />
            </div>
        </div>
    )
}
