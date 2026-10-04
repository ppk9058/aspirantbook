"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, ThumbsUp, ThumbsDown, RotateCcw, Copy, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatExerciseProps {
    title: string
    description: string
    question: string
    options: string[]
    correctOptionIndex: number
    onComplete: () => void
}

export function ChatExercise({
    title,
    description,
    question,
    options,
    correctOptionIndex,
    onComplete,
}: ChatExerciseProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [messages, setMessages] = useState([
        { role: "user", content: "hi" },
        { role: "assistant", content: "Hello! How can I assist you today?" }
    ])
    const [input, setInput] = useState("")
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)

    const handleSend = () => {
        if (!input.trim()) return
        const newMessages = [...messages, { role: "user", content: input }]
        setMessages(newMessages)
        setInput("")

        // Simulate response
        setTimeout(() => {
            setMessages([...newMessages, {
                role: "assistant",
                content: "I am a simulated OpenAI API response. In a real implementation, this would connect to the actual API."
            }])
        }, 1000)
    }

    const handleSubmit = () => {
        if (selectedOption === null) return
        setIsSubmitted(true)
        if (selectedOption === correctOptionIndex) {
            setIsCorrect(true)
            onComplete()
        } else {
            setIsCorrect(false)
        }
    }

    return (
        <div className="flex h-full bg-gray-50">
            {/* Left Panel - Instructions & Quiz */}
            <div className="w-1/2 flex flex-col border-r bg-white">
                <div className="flex items-center h-12 px-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded text-sm font-medium text-gray-700">
                        <span className="h-4 w-4 flex items-center justify-center border rounded bg-gray-100 text-xs">≡</span>
                        Exercise
                    </div>
                </div>

                <ScrollArea className="flex-1 p-8">
                    <h1 className="text-2xl font-bold mb-4">{title}</h1>
                    <div className="prose prose-sm max-w-none text-gray-600 mb-8">
                        <p>{description}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border">
                        <p className="font-medium text-gray-900 mb-4 italic">
                            Using the ChatGPT interface, answer the following question: {question}
                        </p>

                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-900">Possible Answers</h3>
                            {options.map((option, idx) => (
                                <label
                                    key={idx}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors",
                                        selectedOption === idx
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border flex items-center justify-center",
                                        selectedOption === idx ? "border-blue-500" : "border-gray-300"
                                    )}>
                                        {selectedOption === idx && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="quiz-option"
                                        className="hidden"
                                        checked={selectedOption === idx}
                                        onChange={() => {
                                            setSelectedOption(idx)
                                            setIsSubmitted(false)
                                        }}
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {isSubmitted && (
                        <div className={cn(
                            "mt-4 p-4 rounded border flex items-center gap-2",
                            isCorrect ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                        )}>
                            {isCorrect ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span>Correct! Well done.</span>
                                </>
                            ) : (
                                <span>Incorrect. Please try again.</span>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t bg-white flex justify-end">
                    <Button
                        onClick={handleSubmit}
                        disabled={selectedOption === null}
                        className={cn(
                            "px-8 font-bold",
                            isCorrect
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-green-500 hover:bg-green-600 text-white"
                        )}
                    >
                        Submit Answer
                    </Button>
                </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="w-1/2 flex flex-col bg-gray-50">
                <div className="h-12 px-4 border-b bg-white flex items-center justify-between">
                    <span className="font-semibold text-sm">ChatGPT</span>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Clear Chat
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className="flex gap-4 group">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    msg.role === "user" ? "bg-amber-900" : "bg-green-600"
                                )}>
                                    {msg.role === "user" ? (
                                        <span className="text-xs text-white">PK</span>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="prose prose-sm max-w-none bg-white p-3 rounded-lg shadow-sm">
                                        <p>{msg.content}</p>
                                    </div>
                                    {msg.role === "assistant" && (
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                                                <ThumbsUp className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                                                <ThumbsDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-white border-t">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Send a message"
                            className="w-full pl-4 pr-12 py-3 rounded border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                        <span>You can send 30 messages per hour</span>
                        <span className="flex items-center gap-1">
                            Powered by
                            <span className="font-semibold">OpenAI</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
