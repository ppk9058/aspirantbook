import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.test" })

function extractProjectRef(urlStr?: string): { host: string; ref: string } {
    if (!urlStr) return { host: "none", ref: "none" }
    try {
        const u = new URL(urlStr)
        const host = u.host
        // Example: aws-1-ap-south-1.pooler.supabase.com or db.abcdefg.supabase.co
        const parts = host.split(".")
        let ref = host
        if (host.includes("supabase")) {
            ref = parts[0]
        } else if (host.includes("localhost") || host.includes("127.0.0.1")) {
            ref = "localhost"
        }
        return { host, ref }
    } catch {
        return { host: "invalid", ref: "invalid" }
    }
}

export function assertTestDb() {
    const currentDb = process.env.DATABASE_URL
    const testDb = process.env.TEST_DATABASE_URL
    const devDb = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL

    const currentInfo = extractProjectRef(currentDb)
    const testInfo = extractProjectRef(testDb)
    const devInfo = extractProjectRef(devDb)

    const maskedHost = currentInfo.host.replace(/(.{3})(.*)(.{3})/, "$1***$3")

    console.log(`[DB GUARD] Target DB Host: ${maskedHost} | Ref: ${currentInfo.ref}`)

    if (!testDb) {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL is not set! Writes to dev database are strictly prohibited.`
        )
    }

    if (currentDb !== testDb) {
        throw new Error(
            `[DB GUARD VIOLATION] Process DATABASE_URL does not match TEST_DATABASE_URL. Refusing to write to dev database.`
        )
    }

    if (currentInfo.ref === devInfo.ref && currentInfo.ref !== "localhost") {
        throw new Error(
            `[DB GUARD VIOLATION] TEST_DATABASE_URL project ref (${testInfo.ref}) matches DEV project ref (${devInfo.ref})! Refusing to write.`
        )
    }

    return {
        isTestDb: true,
        maskedHost,
        ref: currentInfo.ref,
    }
}
