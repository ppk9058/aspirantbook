"use client"

import { useState } from "react"
import Editor from "@/components/editor/LazyMonacoEditor"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, RotateCcw, Lightbulb, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeEditorProps {
    language: string
    starterCode: string
    testCases: Array<{
        input: string
        expected: string
    }>
    onSubmit?: (code: string) => void
}

export function CodeEditor({
    language,
    starterCode,
    testCases,
    onSubmit,
}: CodeEditorProps) {
    const [code, setCode] = useState(starterCode)
    const [output, setOutput] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [testResults, setTestResults] = useState<Array<{
        passed: boolean
        input: string
        expected: string
        actual: string
    }> | null>(null)

    const handleReset = () => {
        setCode(starterCode)
        setOutput("")
        setTestResults(null)
    }

    const handleRun = async () => {
        setIsRunning(true)
        setOutput("")
        setTestResults(null)

        try {
            const response = await fetch("/api/execute", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code,
                    language: language.toLowerCase(),
                    testCases: testCases.map(t => ({
                        input: t.input,
                        expectedOutput: t.expected,
                    })),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setOutput(`Error: ${data.error || "Failed to execute code"}`)
                return
            }

            // Set output
            setOutput(data.output || "No output")

            // Set test results if available
            if (data.testResults) {
                const results = data.testResults.map((result: any) => ({
                    passed: result.passed,
                    input: result.input,
                    expected: result.expectedOutput,
                    actual: result.actualOutput,
                }))
                setTestResults(results)
            }
        } catch (error) {
            setOutput("Error: " + (error as Error).message)
        } finally {
            setIsRunning(false)
        }
    }

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(code)
        }
    }

    const allTestsPassed = testResults?.every((r) => r.passed) ?? false

    return (
        <div className="flex flex-col h-full">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{language}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={isRunning}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRun}
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 mr-2" />
                                Run Code
                            </>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isRunning || !allTestsPassed}
                        className="bg-success-600 hover:bg-success-700"
                    >
                        Submit
                    </Button>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    language={language.toLowerCase()}
                    value={code}
                    onChange={(value) => setCode(value || "")}
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

            {/* Output Section */}
            {(output || testResults) && (
                <div className="border-t bg-gray-50 dark:bg-gray-900 p-4 max-h-64 overflow-y-auto custom-scrollbar">
                    {/* Console Output */}
                    {output && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2">Console Output:</h4>
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono">
                                {output}
                            </pre>
                        </div>
                    )}

                    {/* Test Results */}
                    {testResults && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Test Results:</h4>
                            <div className="space-y-2">
                                {testResults.map((result, index) => (
                                    <Card
                                        key={index}
                                        className={cn(
                                            "p-3",
                                            result.passed
                                                ? "border-success-500 bg-success-50 dark:bg-success-950"
                                                : "border-danger-500 bg-danger-50 dark:bg-danger-950"
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            {result.passed ? (
                                                <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 text-sm">
                                                <p className="font-semibold mb-1">
                                                    Test {index + 1}: {result.passed ? "Passed" : "Failed"}
                                                </p>
                                                <div className="space-y-1 text-xs">
                                                    <p>
                                                        <span className="text-muted-foreground">Input:</span>{" "}
                                                        <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                                                            {result.input}
                                                        </code>
                                                    </p>
                                                    <p>
                                                        <span className="text-muted-foreground">Expected:</span>{" "}
                                                        <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                                                            {result.expected}
                                                        </code>
                                                    </p>
                                                    {!result.passed && (
                                                        <p>
                                                            <span className="text-muted-foreground">Actual:</span>{" "}
                                                            <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                                                                {result.actual}
                                                            </code>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
