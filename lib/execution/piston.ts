// Piston API Client for Code Execution
// Documentation: https://github.com/engineer-man/piston

const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston"

export interface ExecutionRequest {
    language: string
    version?: string
    code: string
    stdin?: string
    args?: string[]
    compileTimeout?: number
    runTimeout?: number
}

export interface ExecutionResult {
    language: string
    version: string
    run: {
        stdout: string
        stderr: string
        code: number
        signal: string | null
        output: string
    }
    compile?: {
        stdout: string
        stderr: string
        code: number
        signal: string | null
        output: string
    }
}

// Supported languages with their versions
export const SUPPORTED_LANGUAGES = {
    python: { version: "3.10.0", name: "Python" },
    javascript: { version: "18.15.0", name: "JavaScript (Node.js)" },
    typescript: { version: "5.0.3", name: "TypeScript" },
    java: { version: "15.0.2", name: "Java" },
    cpp: { version: "10.2.0", name: "C++" },
    c: { version: "10.2.0", name: "C" },
    go: { version: "1.16.2", name: "Go" },
    rust: { version: "1.68.2", name: "Rust" },
} as const

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES

export async function executeCode({
    language,
    version,
    code,
    stdin = "",
    args = [],
    compileTimeout = 10000,
    runTimeout = 3000,
}: ExecutionRequest): Promise<ExecutionResult> {
    const languageConfig = SUPPORTED_LANGUAGES[language as SupportedLanguage]

    if (!languageConfig) {
        throw new Error(`Unsupported language: ${language}`)
    }

    const response = await fetch(`${PISTON_API_URL}/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            language,
            version: version || languageConfig.version,
            files: [
                {
                    content: code,
                },
            ],
            stdin,
            args,
            compile_timeout: compileTimeout,
            run_timeout: runTimeout,
        }),
    })

    if (!response.ok) {
        throw new Error(`Piston API error: ${response.statusText}`)
    }

    const result: ExecutionResult = await response.json()
    return result
}

export async function getAvailableLanguages() {
    const response = await fetch(`${PISTON_API_URL}/runtimes`)

    if (!response.ok) {
        throw new Error(`Failed to fetch runtimes: ${response.statusText}`)
    }

    return response.json()
}

export function formatOutput(result: ExecutionResult): string {
    // If there's a compilation error, show it
    if (result.compile && result.compile.code !== 0) {
        return result.compile.output || result.compile.stderr
    }

    // If there's a runtime error, show it
    if (result.run.code !== 0) {
        return result.run.output || result.run.stderr
    }

    // Otherwise show the output
    return result.run.output || result.run.stdout
}

export function isExecutionSuccessful(result: ExecutionResult): boolean {
    // Check if compilation succeeded (if applicable)
    if (result.compile && result.compile.code !== 0) {
        return false
    }

    // Check if execution succeeded
    return result.run.code === 0
}
