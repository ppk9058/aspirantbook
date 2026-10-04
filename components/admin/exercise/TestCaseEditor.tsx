"use client"

import { Plus, Trash2, Eye, EyeOff } from "lucide-react"

interface TestCase {
    input: string
    expectedOutput: string
    isHidden: boolean
}

interface TestCaseEditorProps {
    testCases: TestCase[]
    onChange: (cases: TestCase[]) => void
}

export default function TestCaseEditor({ testCases, onChange }: TestCaseEditorProps) {
    const addTestCase = () => {
        onChange([
            ...testCases,
            { input: "", expectedOutput: "", isHidden: false }
        ])
    }

    const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
        const newCases = [...testCases]
        newCases[index] = { ...newCases[index], [field]: value }
        onChange(newCases)
    }

    const removeTestCase = (index: number) => {
        onChange(testCases.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Test Cases ({testCases.length})</h3>
                <button
                    type="button"
                    onClick={addTestCase}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" /> Add Test Case
                </button>
            </div>

            <div className="space-y-4">
                {testCases.map((testCase, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                        <button
                            onClick={() => removeTestCase(index)}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove test case"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Input (stdin)</label>
                                <textarea
                                    value={testCase.input}
                                    onChange={(e) => updateTestCase(index, "input", e.target.value)}
                                    className="w-full text-sm font-mono rounded-md border-gray-300 shadow-sm focus:border-[#3AAFA9] focus:ring-[#3AAFA9]"
                                    rows={2}
                                    placeholder="Input data..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Expected Output (stdout)</label>
                                <textarea
                                    value={testCase.expectedOutput}
                                    onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                                    className="w-full text-sm font-mono rounded-md border-gray-300 shadow-sm focus:border-[#3AAFA9] focus:ring-[#3AAFA9]"
                                    rows={2}
                                    placeholder="Expected output..."
                                />
                            </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => updateTestCase(index, "isHidden", !testCase.isHidden)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${testCase.isHidden
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                    }`}
                            >
                                {testCase.isHidden ? (
                                    <>
                                        <EyeOff className="h-3 w-3" /> Hidden Case
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-3 w-3" /> Visible Case
                                    </>
                                )}
                            </button>
                            <span className="text-xs text-gray-400">
                                {testCase.isHidden
                                    ? "Student cannot see this test case"
                                    : "Student can see input/output"}
                            </span>
                        </div>
                    </div>
                ))}

                {testCases.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-gray-500 text-sm mb-2">No test cases added</p>
                        <button
                            type="button"
                            onClick={addTestCase}
                            className="text-[#3AAFA9] hover:underline text-sm font-medium"
                        >
                            Add your first test case
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
