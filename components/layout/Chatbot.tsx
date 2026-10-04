"use client"

import { MessageSquare, X, Send, Sparkles, Bot } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function Chatbot() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
        {
            role: "assistant",
            content: "Hi! I'm your AI Learning Assistant. Ask me anything about your current lesson, Python syntax, algorithms, or study roadmaps.",
        },
    ])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Hide AI floating button on full-screen / examination flows
    const isHiddenFlow = Boolean(
        pathname && (
            pathname.includes("/attempt") ||
            pathname.includes("/result") ||
            pathname.includes("/solutions") ||
            pathname.includes("/declaration") ||
            pathname.includes("/instructions") ||
            pathname.includes("/take") ||
            pathname.startsWith("/test-execution")
        )
    )

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    if (isHiddenFlow) {
        return null
    }

    const handleSend = () => {
        if (!input.trim() || isTyping) return

        const userMsg = input.trim()
        setMessages((prev) => [...prev, { role: "user", content: userMsg }])
        setInput("")
        setIsTyping(true)

        // Mock LLM response for instant interactive experience
        setTimeout(() => {
            let reply = "Great question! Let's break this down step-by-step to master the core concept."
            const lower = userMsg.toLowerCase()

            if (lower.includes("python") || lower.includes("code")) {
                reply = "In Python, always focus on clean readability and proper data structure selection. For iterative solutions, consider list comprehensions or generator expressions!"
            } else if (lower.includes("course") || lower.includes("track")) {
                reply = "I recommend checking out the Career Tracks tab to see structured curricula designed from scratch to job readiness."
            } else if (lower.includes("streak") || lower.includes("xp")) {
                reply = "Keep your momentum going! Completing a lesson or coding practice problem today secures your daily streak."
            }

            setMessages((prev) => [...prev, { role: "assistant", content: reply }])
            setIsTyping(false)
        }, 800)
    }

    const isStickyBarPage = Boolean(
        pathname &&
        pathname.startsWith("/test-series/") &&
        !pathname.includes("/my-tests") &&
        !pathname.includes("/leaderboard")
    )

    return (
        <>
            {/* Floating Chat Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                data-ai-button="true"
                className={`fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-3 sm:right-5 z-40 h-10 w-10 sm:h-12 sm:w-12 p-2 sm:p-2.5 rounded-full bg-gradient-to-r from-[#3AAFA9] to-[#1DB954] text-white shadow-lg hover:shadow-xl items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation ${
                    isStickyBarPage ? "hidden sm:flex" : "flex"
                }`}
                aria-label="Open AI Learning Assistant"
            >
                {isOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {/* Chat Drawer / Window */}
            {isOpen && (
                <div className="fixed bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-96 max-h-[calc(100vh-160px)] h-[460px] bg-white dark:bg-[#05192D] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#05192D] to-[#0a2540] text-white border-b border-gray-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#3AAFA9]/20 border border-[#3AAFA9]/40 flex items-center justify-center text-[#3AAFA9]">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xs">AI Study Companion</h3>
                                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    Online
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="text-gray-300 hover:text-white hover:bg-white/10 h-7 w-7 p-0 rounded-lg"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-gray-50/50 dark:bg-[#030f1d]/50 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                                        m.role === "user"
                                            ? "bg-[#3AAFA9] text-white rounded-br-xs shadow-xs"
                                            : "bg-white dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 border border-gray-200/80 dark:border-gray-700/80 rounded-bl-xs shadow-xs"
                                    }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-xs px-3 py-2 text-gray-400 text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Footer */}
                    <div className="p-2.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D]">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSend()
                            }}
                            className="flex items-center gap-1.5"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a doubt or request a hint..."
                                className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="p-2 bg-[#3AAFA9] hover:bg-[#2d8a85] disabled:opacity-50 text-white rounded-xl transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
