"use client"

interface MCQQuestionProps {
    question: {
        question: string
        options?: string[]
    }
    answer?: string
    onAnswerChange: (answer: string) => void
}

export default function MCQQuestion({ question, answer, onAnswerChange }: MCQQuestionProps) {
    const options = question.options || []

    return (
        <div className="space-y-6">
            <div className="prose prose-sm max-w-none">
                <p className="text-lg text-gray-900 whitespace-pre-wrap">{question.question}</p>
            </div>

            <div className="space-y-3">
                {options.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
                    const isSelected = answer === String(index)

                    return (
                        <button
                            key={index}
                            onClick={() => onAnswerChange(String(index))}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                                    ? "border-[#3AAFA9] bg-[#3AAFA9]/10"
                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium ${isSelected
                                            ? "bg-[#3AAFA9] text-white"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {optionLetter}
                                </div>
                                <p className="flex-1 text-gray-900 pt-1">{option}</p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
