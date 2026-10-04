import { chromium } from "playwright"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

dotenv.config({ path: ".env.test" })
dotenv.config({ path: ".env" })

const testPassword = process.env.TEST_USER_PASSWORD
if (!testPassword) {
    console.error("Missing TEST_USER_PASSWORD in .env.test")
    process.exit(1)
}

const ACCOUNTS = [
    {
        email: "student.audit@trillioskills.com",
        storageFile: ".auth/student-audit.json",
        expectedRole: "PREMIUM",
    },
    {
        email: "student.empty@trillioskills.com",
        storageFile: ".auth/student-empty.json",
        expectedRole: "FREE",
    },
    {
        email: "teacher.audit@trillioskills.com",
        storageFile: ".auth/teacher-audit.json",
        expectedRole: "TEACHER",
    },
]

async function main() {
    fs.mkdirSync(".auth", { recursive: true })

    const browser = await chromium.launch({ headless: true })

    for (const acc of ACCOUNTS) {
        console.log(`🔑 Logging in ${acc.email}...`)
        const context = await browser.newContext()
        const page = await context.newPage()

        await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })

        // Fill credentials
        await page.locator('input[name="email"]').fill(acc.email)
        await page.locator('input[name="password"]').fill(testPassword)

        // Submit form
        await Promise.all([
            page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
            page.locator('button:has-text("Sign In")').click(),
        ])

        // Give a moment for cookies to settle
        await page.waitForTimeout(2000)

        const currentUrl = page.url()
        console.log(`   Navigated to: ${currentUrl}`)

        // Save storage state
        await context.storageState({ path: acc.storageFile })
        console.log(`   ✓ Saved storageState to ${acc.storageFile}`)

        await context.close()
    }

    await browser.close()
    console.log("✅ All storage states saved successfully.")
}

main().catch((err) => {
    console.error("❌ Login setup error:", err)
    process.exit(1)
})
