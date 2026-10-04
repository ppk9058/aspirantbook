"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Terminal, Play, RotateCcw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface TestCase {
    id: string
    description: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    errorMessage?: string
}

interface TestRunnerPanelProps {
    testCases: TestCase[]
    consoleOutput: string[]
    activeTab: 'tests' | 'console'
    onTabChange: (tab: 'tests' | 'console') => void
}

export function TestRunnerPanel({
    testCases,
    consoleOutput,
    activeTab,
    onTabChange
}: TestRunnerPanelProps) {
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-gray-700">
            {/* Tabs */}
            <div className="flex items-center border-b border-gray-700 h-9 bg-[#252526]">
                <button
                    onClick={() => onTabChange('tests')}
                    className={cn(
                        "px-4 h-full text-xs font-medium flex items-center gap-2 border-r border-gray-700 transition-colors",
                        activeTab === 'tests'
                            ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#3AAFA9]"
                            : "text-gray-400 hover:bg-[#2d2d2d]"
                    )}
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Test Results
                </button>
                <button
                    onClick={() => onTabChange('console')}
                    className={cn(
                        "px-4 h-full text-xs font-medium flex items-center gap-2 border-r border-gray-700 transition-colors",
                        activeTab === 'console'
                            ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#3AAFA9]"
                            : "text-gray-400 hover:bg-[#2d2d2d]"
                    )}
                >
                    <Terminal className="h-3.5 w-3.5" />
                    Console
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'tests' ? (
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-1">
                            {testCases.map((test) => (
                                <div
                                    key={test.id}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-md text-sm transition-colors",
                                        test.status === 'passed' ? "bg-green-500/10" :
                                            test.status === 'failed' ? "bg-red-500/10" :
                                                test.status === 'running' ? "bg-blue-500/10" :
                                                    "bg-[#2d2d2d]"
                                    )}
                                >
                                    <div className="mt-0.5">
                                        {test.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        {test.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                                        {test.status === 'running' && <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                                        {test.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-gray-600" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={cn(
                                            "font-medium",
                                            test.status === 'passed' ? "text-green-400" :
                                                test.status === 'failed' ? "text-red-400" :
                                                    test.status === 'running' ? "text-blue-400" :
                                                        "text-gray-400"
                                        )}>
                                            {test.description}
                                        </p>
                                        {test.errorMessage && (
                                            <p className="text-xs text-red-400 mt-1 font-mono bg-black/30 p-2 rounded">
                                                {test.errorMessage}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {testCases.length === 0 && (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Run your code to see test results
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <ScrollArea className="h-full bg-[#1e1e1e]">
                        <div className="p-4 font-mono text-sm">
                            {consoleOutput.length > 0 ? (
                                consoleOutput.map((line, i) => (
                                    <div key={i} className="text-gray-300 mb-1 border-b border-gray-800/50 pb-1 last:border-0">
                                        <span className="text-green-500 mr-2">➜</span>
                                        {line}
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500 italic">Console output will appear here...</div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    )
}
