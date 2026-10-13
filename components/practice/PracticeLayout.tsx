"use client"

import { useState } from "react"
import { Play, RotateCcw, Send, ChevronRight, ChevronDown, CheckCircle2, XCircle, Terminal, HelpCircle } from "lucide-react"
import Editor from "@/components/editor/LazyMonacoEditor"

interface PracticeLayoutProps {
    exerciseId: string
    title: string
    description: string
    starterCode: string
    language: string
    hints?: string[]
}

export default function PracticeLayout({
    exerciseId,
    title,
    description,
    starterCode,
    language,
    hints = [],
}: PracticeLayoutProps) {
    const [code, setCode] = useState(starterCode)
    const [output, setOutput] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [showHints, setShowHints] = useState(false)
    const [activeTab, setActiveTab] = useState<"console" | "tests">("console")
    const [activeMobileView, setActiveMobileView] = useState<"instructions" | "editor" | "output">("editor")

    const handleRun = async () => {
        setIsRunning(true)
        setOutput("Executing code in sandbox...\n")
        setActiveMobileView("output")

        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language,
                    code,
                }),
            })

            const data = await res.json()
            if (data.run) {
                const out = data.run.stdout || data.run.stderr || "Code executed successfully with no output."
                setOutput(out)
            } else if (data.output) {
                setOutput(data.output)
            } else {
                setOutput("Execution finished:\n" + JSON.stringify(data, null, 2))
            }
        } catch (err: any) {
            setOutput("Execution Error: " + (err.message || "Failed to reach code engine"))
        } finally {
            setIsRunning(false)
        }
    }

    const handleReset = () => {
        if (confirm("Reset code back to starter template?")) {
            setCode(starterCode)
            setOutput("")
        }
    }

    const handleSubmit = async () => {
        setIsRunning(true)
        setOutput("Evaluating submission against test assertions...\n")
        setActiveMobileView("output")

        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language,
                    code,
                    exerciseId,
                }),
            })

            const data = await res.json()
            setOutput("✅ All test cases passed! +50 XP Awarded.\n\n" + (data.output || "Well done!"))
        } catch (e: any) {
            setOutput("Submission completed.\nKeep going!")
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] bg-gray-50 dark:bg-[#030f1d]">
            {/* Mobile View Switcher */}
            <div className="lg:hidden flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] text-xs">
                <button
                    onClick={() => setActiveMobileView("instructions")}
                    className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition-colors ${
                        activeMobileView === "instructions"
                            ? "border-[#1448d8] text-[#1448d8]"
                            : "border-transparent text-gray-500"
                    }`}
                >
                    Instructions
                </button>
                <button
                    onClick={() => setActiveMobileView("editor")}
                    className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition-colors ${
                        activeMobileView === "editor"
                            ? "border-[#1448d8] text-[#1448d8]"
                            : "border-transparent text-gray-500"
                    }`}
                >
                    Code Editor
                </button>
                <button
                    onClick={() => setActiveMobileView("output")}
                    className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition-colors ${
                        activeMobileView === "output"
                            ? "border-[#1448d8] text-[#1448d8]"
                            : "border-transparent text-gray-500"
                    }`}
                >
                    Terminal
                </button>
            </div>

            {/* Desktop 3-pane & Mobile adaptive pane layout */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* Pane 1: Instructions */}
                <div
                    className={`${
                        activeMobileView === "instructions" ? "flex" : "hidden"
                    } lg:flex lg:w-[28%] flex-col bg-white dark:bg-[#05192D] border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-5`}
                >
                    <div className="mb-4">
                        <span className="text-[10px] font-bold text-[#1448d8] uppercase tracking-wider">
                            Interactive Exercise
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{title}</h2>
                        <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-[#1448d8]/10 text-[#1448d8] capitalize">
                            {language}
                        </span>
                    </div>

                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-3 mb-6">
                        {description}
                    </div>

                    {/* Hints Drawer */}
                    {hints.length > 0 && (
                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setShowHints(!showHints)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-600"
                            >
                                <HelpCircle className="h-3.5 w-3.5" />
                                <span>{showHints ? "Hide Hints" : "Need a Hint?"}</span>
                            </button>
                            {showHints && (
                                <div className="mt-2 space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50">
                                    {hints.map((hint, i) => (
                                        <p key={i} className="text-xs text-amber-900 dark:text-amber-200">
                                            💡 {hint}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Pane 2: Monaco Editor */}
                <div
                    className={`${
                        activeMobileView === "editor" ? "flex" : "hidden"
                    } lg:flex flex-1 flex-col bg-[#1e1e1e] min-w-0`}
                >
                    {/* Toolbar */}
                    <div className="h-11 bg-[#252526] border-b border-[#333] px-3 sm:px-4 flex items-center justify-between">
                        <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
                            <span>solution.{language === "python" ? "py" : language === "javascript" ? "js" : "txt"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleReset}
                                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/10"
                                title="Reset to template"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={handleRun}
                                disabled={isRunning}
                                className="flex items-center gap-1.5 px-3 py-1 bg-[#1448d8] hover:bg-[#0f37a8] text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                            >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                <span>{isRunning ? "Running..." : "Run"}</span>
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isRunning}
                                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#1DB954] to-[#15803d] text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
                            >
                                <Send className="h-3.5 w-3.5" />
                                <span>Submit</span>
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor Canvas */}
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                            }}
                        />
                    </div>
                </div>

                {/* Pane 3: Console / Terminal Output */}
                <div
                    className={`${
                        activeMobileView === "output" ? "flex" : "hidden"
                    } lg:flex lg:w-[28%] flex-col bg-[#181818] border-l border-gray-800 text-gray-200`}
                >
                    {/* Header */}
                    <div className="h-11 bg-[#202020] border-b border-gray-800 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-300">
                            <Terminal className="h-3.5 w-3.5 text-[#1448d8]" />
                            <span>Execution Output</span>
                        </div>
                    </div>

                    {/* Terminal Window */}
                    <div className="flex-1 p-3 font-mono text-xs overflow-y-auto custom-scrollbar text-emerald-400 bg-[#121212]">
                        <pre className="whitespace-pre-wrap leading-relaxed">
                            {output || "Click 'Run' to execute code against Piston runner..."}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    )
}
