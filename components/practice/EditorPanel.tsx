"use client"

import { useState } from "react"
import type { OnMount } from "@monaco-editor/react"
import Editor from "@/components/editor/LazyMonacoEditor"
import { Settings, RotateCcw, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EditorPanelProps {
    code: string
    onChange: (value: string | undefined) => void
    language?: string
    onRun: () => void
    onReset: () => void
    isRunning: boolean
}

export function EditorPanel({
    code,
    onChange,
    language = "python",
    onRun,
    onReset,
    isRunning
}: EditorPanelProps) {
    const [fontSize, setFontSize] = useState(14)
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Editor Toolbar */}
            <div className="h-10 bg-[#252526] border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-[#1e1e1e] border border-gray-700 rounded text-xs text-blue-400 font-mono">
                        <span>main.py</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42]"
                        title="Reset Code"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42]"
                        title="Copy Code"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-gray-400 hover:text-white hover:bg-[#3e3e42]"
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#252526] border-gray-700 text-gray-300">
                            <DropdownMenuItem onClick={() => setFontSize(12)}>Font Size: Small</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFontSize(14)}>Font Size: Medium</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFontSize(16)}>Font Size: Large</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFontSize(18)}>Font Size: Extra Large</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage={language}
                    value={code}
                    onChange={onChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: fontSize,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        renderWhitespace: "selection",
                        tabSize: 4,
                    }}
                />

                {/* Floating Run Button */}
                <div className="absolute bottom-4 right-4 z-10">
                    <Button
                        onClick={onRun}
                        disabled={isRunning}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                    >
                        {isRunning ? (
                            <>
                                <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <div className="mr-2 border border-white rounded-full p-0.5">
                                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                                </div>
                                Run Code
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
