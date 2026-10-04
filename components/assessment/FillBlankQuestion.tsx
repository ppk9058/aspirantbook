"use client"

interface FillBlankQuestionProps {
    question: {
        question: string
    }
    answer?: string
    onAnswerChange: (answer: string) => void
}

export default function FillBlankQuestion({ question, answer, onAnswerChange }: FillBlankQuestionProps) {
    return (
        <div className="space-y-6">
            <div className="prose prose-sm max-w-none">
                <p className="text-lg text-gray-900 whitespace-pre-wrap">{question.question}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                </label>
                <input
                    type="text"
                    value={answer || ""}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3AAFA9] focus:border-transparent outline-none transition-all"
                />
            </div>
        </div>
    )
}
