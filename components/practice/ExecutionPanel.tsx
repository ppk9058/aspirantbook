"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TestResult {
    passed: boolean
    input: string
    expectedOutput: string
    actualOutput: string
    error?: string
}

interface ExecutionPanelProps {
    output?: string
    error?: string
    executionTime?: number
    testResults?: TestResult[]
    isLoading?: boolean
}

export function ExecutionPanel({
    output,
    error,
    executionTime,
    testResults,
    isLoading,
}: ExecutionPanelProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Executing Code...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    if (!output && !error && !testResults) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Output</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Run your code to see the output here
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Console Output */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Console Output</CardTitle>
                        {executionTime !== undefined && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {executionTime}ms
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <pre className={cn(
                        "p-4 rounded-md text-sm font-mono overflow-x-auto",
                        error ? "bg-red-50 text-red-900" : "bg-muted"
                    )}>
                        {error || output || "No output"}
                    </pre>
                </CardContent>
            </Card>

            {/* Test Results */}
            {testResults && testResults.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Test Cases</span>
                            <Badge variant={testResults.every(t => t.passed) ? "default" : "destructive"}>
                                {testResults.filter(t => t.passed).length} / {testResults.length} Passed
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {testResults.map((result, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "p-4 rounded-lg border",
                                    result.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">Test Case {index + 1}</span>
                                    {result.passed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                </div>

                                {result.input && (
                                    <div className="mb-2">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Input:</p>
                                        <pre className="text-xs bg-white p-2 rounded border">{result.input}</pre>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Expected:</p>
                                        <pre className="text-xs bg-white p-2 rounded border">{result.expectedOutput}</pre>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Actual:</p>
                                        <pre className={cn(
                                            "text-xs p-2 rounded border",
                                            result.passed ? "bg-white" : "bg-red-50 border-red-200"
                                        )}>
                                            {result.actualOutput || result.error || "No output"}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
