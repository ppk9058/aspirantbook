// Test Case Validation Logic

export interface TestCase {
    input: string
    expectedOutput: string
    isHidden?: boolean
}

export interface TestResult {
    passed: boolean
    input: string
    expectedOutput: string
    actualOutput: string
    error?: string
}

export function normalizeOutput(output: string): string {
    return output
        .trim()
        .replace(/\r\n/g, "\n") // Normalize line endings
        .replace(/\s+$/gm, "") // Remove trailing whitespace from each line
}

export function compareOutputs(expected: string, actual: string): boolean {
    const normalizedExpected = normalizeOutput(expected)
    const normalizedActual = normalizeOutput(actual)

    return normalizedExpected === normalizedActual
}

export function validateTestCase(
    testCase: TestCase,
    actualOutput: string
): TestResult {
    const passed = compareOutputs(testCase.expectedOutput, actualOutput)

    return {
        passed,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: normalizeOutput(actualOutput),
    }
}

export function validateTestCases(
    testCases: TestCase[],
    getOutput: (input: string) => Promise<string>
): Promise<TestResult[]> {
    return Promise.all(
        testCases.map(async (testCase) => {
            try {
                const output = await getOutput(testCase.input)
                return validateTestCase(testCase, output)
            } catch (error) {
                return {
                    passed: false,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: "",
                    error: error instanceof Error ? error.message : "Unknown error",
                }
            }
        })
    )
}

export function calculateScore(results: TestResult[]): {
    passed: number
    total: number
    percentage: number
} {
    const passed = results.filter((r) => r.passed).length
    const total = results.length
    const percentage = total > 0 ? (passed / total) * 100 : 0

    return { passed, total, percentage }
}

export function allTestsPassed(results: TestResult[]): boolean {
    return results.every((r) => r.passed)
}
