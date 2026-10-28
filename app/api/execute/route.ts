import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { executeCode, formatOutput, isExecutionSuccessful } from "@/lib/execution/piston"
import { validateTestCase, type TestCase, type TestResult } from "@/lib/execution/validator"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
    try {
        const session = await auth()

        // Guest or authenticated execution allowed, with IP-based rate limiting (10 req/min)
        const ip = getClientIp(request)

        const rateLimitKey = session?.user?.id ? `exec_user_${session.user.id}` : `exec_ip_${ip}`
        const rl = await checkRateLimit(rateLimitKey, 10, 60, { failClosed: true })

        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many requests. Please wait a minute before running code again." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": "60",
                    },
                }
            )
        }

        const { code, language, stdin, testCases } = await request.json()

        if (!code || !language) {
            return NextResponse.json(
                { error: "Code and language are required" },
                { status: 400 }
            )
        }

        // Validate code length (max 10KB)
        if (code.length > 10240) {
            return NextResponse.json(
                { error: "Code is too long (max 10KB)" },
                { status: 400 }
            )
        }

        // Execute code
        const startTime = Date.now()
        const result = await executeCode({
            language,
            code,
            stdin: stdin || "",
            runTimeout: 3000, // 3 seconds
            compileTimeout: 10000, // 10 seconds
        })
        const executionTime = Date.now() - startTime

        const output = formatOutput(result)
        const success = isExecutionSuccessful(result)

        // If test cases are provided, validate them
        let testResults: TestResult[] | undefined

        if (testCases && Array.isArray(testCases)) {
            testResults = testCases.map((testCase: TestCase) => {
                // For each test case, we need to re-run the code with that input
                // For now, we'll just validate against the current output
                // In a real implementation, you'd run the code multiple times
                return validateTestCase(testCase, output)
            })
        }

        return NextResponse.json({
            success,
            output,
            executionTime,
            language: result.language,
            version: result.version,
            testResults,
        })
    } catch (error) {
        console.error("Code execution error:", error)

        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { error: "Failed to execute code" },
            { status: 500 }
        )
    }
}
