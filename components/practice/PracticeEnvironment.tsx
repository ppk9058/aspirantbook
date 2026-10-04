"use client"

import { useState, useEffect } from "react"
import { ResizableLayout } from "./ResizableLayout"
import { InstructionsPanel } from "./InstructionsPanel"
import { EditorPanel } from "./EditorPanel"
import { TestRunnerPanel, TestCase } from "./TestRunnerPanel"

interface PracticeEnvironmentProps {
    title: string
    instructions: string
    starterCode: string
    onComplete: () => void
}

export function PracticeEnvironment({
    title,
    instructions,
    starterCode,
    onComplete
}: PracticeEnvironmentProps) {
    const [code, setCode] = useState(starterCode)
    const [isRunning, setIsRunning] = useState(false)
    const [activeTab, setActiveTab] = useState<'tests' | 'console'>('tests')
    const [consoleOutput, setConsoleOutput] = useState<string[]>([])
    const [testCases, setTestCases] = useState<TestCase[]>([
        { id: '1', description: 'Should print "Hello World"', status: 'pending' },
        { id: '2', description: 'Should return a string', status: 'pending' },
        { id: '3', description: 'Should not be empty', status: 'pending' }
    ])

    const handleRun = async () => {
        setIsRunning(true)
        setActiveTab('console')
        setConsoleOutput(['Running code...', '> python main.py'])

        // Reset tests
        setTestCases(prev => prev.map(t => ({ ...t, status: 'pending', errorMessage: undefined })))

        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Simulate console output
        setConsoleOutput(prev => [...prev, 'Hello World', 'Process finished with exit code 0'])

        // Switch to tests and simulate checking
        setActiveTab('tests')

        // Simulate test 1
        setTestCases(prev => prev.map(t => t.id === '1' ? { ...t, status: 'running' } : t))
        await new Promise(resolve => setTimeout(resolve, 800))
        setTestCases(prev => prev.map(t => t.id === '1' ? { ...t, status: 'passed' } : t))

        // Simulate test 2
        setTestCases(prev => prev.map(t => t.id === '2' ? { ...t, status: 'running' } : t))
        await new Promise(resolve => setTimeout(resolve, 800))
        setTestCases(prev => prev.map(t => t.id === '2' ? { ...t, status: 'passed' } : t))

        // Simulate test 3
        setTestCases(prev => prev.map(t => t.id === '3' ? { ...t, status: 'running' } : t))
        await new Promise(resolve => setTimeout(resolve, 800))

        // Randomly fail test 3 if code is default, pass if changed (simple logic for demo)
        const passed = code !== starterCode
        setTestCases(prev => prev.map(t => t.id === '3' ? {
            ...t,
            status: passed ? 'passed' : 'failed',
            errorMessage: passed ? undefined : 'Expected non-empty output matching pattern'
        } : t))

        setIsRunning(false)

        if (passed) {
            setTimeout(() => {
                onComplete()
            }, 1000)
        }
    }

    const handleReset = () => {
        setCode(starterCode)
        setConsoleOutput([])
        setTestCases(prev => prev.map(t => ({ ...t, status: 'pending', errorMessage: undefined })))
    }

    return (
        <div className="h-full w-full bg-gray-100">
            <ResizableLayout
                leftPanel={
                    <InstructionsPanel
                        title={title}
                        instructions={instructions}
                        xp={100}
                        onTakeHint={() => console.log("Hint taken")}
                    />
                }
                rightTopPanel={
                    <EditorPanel
                        code={code}
                        onChange={(val) => setCode(val || "")}
                        onRun={handleRun}
                        onReset={handleReset}
                        isRunning={isRunning}
                    />
                }
                rightBottomPanel={
                    <TestRunnerPanel
                        testCases={testCases}
                        consoleOutput={consoleOutput}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                }
            />
        </div>
    )
}
