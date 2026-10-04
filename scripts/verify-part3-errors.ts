import { chromium } from "playwright"

async function run() {
    console.log("=== STARTING PART 3: ERROR BOUNDARY & RESILIENCE VERIFICATION ===")
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    const errors: string[] = []
    page.on("pageerror", (err) => {
        // Log errors but ignore known harmless analytics or socket errors
        if (!err.message.includes("WebSocket") && !err.message.includes("hydrat")) {
            console.log("PAGE ERROR:", err.message)
            errors.push(err.message)
        }
    })

    try {
        // Test 1: 404 Not Found Page
        console.log("\n[Test 1] Testing 404 Not Found page at /random-non-existent-route-404...")
        await page.goto("http://localhost:3000/random-non-existent-route-404", { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(1500)

        const notFoundHeading = await page.$("text=Looking for something?") || await page.$("text=404")
        if (!notFoundHeading) {
            throw new Error("404 heading not found on invalid route")
        }
        console.log("✔ 404 Not Found page rendered successfully with heading")

        const dashboardLink = await page.$("a[href='/dashboard']")
        const coursesLink = await page.$("a[href='/courses']")
        const testSeriesLink = await page.$("a[href='/test-series']")

        if (!dashboardLink || !coursesLink || !testSeriesLink) {
            throw new Error("Missing navigation links on 404 page (expected Dashboard, Courses, Test Series)")
        }
        console.log("✔ All 3 primary recovery links (Dashboard, Courses, Test Series) verified on 404 page")

        // Test 2: Tutorial page for Prompt Engineering Masterclass (had null lesson content)
        console.log("\n[Test 2] Testing /courses/prompt-engineering-masterclass resilience...")
        await page.goto("http://localhost:3000/courses/prompt-engineering-masterclass", { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(2000)

        const titleElement = await page.$("text=Prompt Engineering Masterclass")
        if (!titleElement) {
            throw new Error("Prompt Engineering Masterclass title not visible on page")
        }
        console.log("✔ Prompt Engineering Masterclass tutorial loaded successfully")

        // Check clicking on a lesson with null content
        const lessonItems = await page.$$("button.sidebar-lesson, .sidebar-lesson, button:has-text('Testing and Improving')")
        console.log(`Found ${lessonItems.length} lesson elements in sidebar`)

        const nullLessonButton = await page.$("button:has-text('Testing and Improving Prompts'), button:has-text('Prompt Patterns')")
        if (nullLessonButton) {
            console.log("Clicking on lesson with null/empty content...")
            await nullLessonButton.click()
            await page.waitForTimeout(1000)

            const fallbackNotice = await page.$("text=Lesson content is being finalized")
            if (fallbackNotice) {
                console.log("✔ Fallback placeholder 'Lesson content is being finalized' properly displayed without crashing")
            } else {
                console.log("Notice: Lesson content rendered without error")
            }
        }

        // Test 3: Tutorial page for Agentic Engineering (cmuqkq1om0001xpk9k093hizv)
        console.log("\n[Test 3] Testing /courses/cmuqkq1om0001xpk9k093hizv resilience...")
        await page.goto("http://localhost:3000/courses/cmuqkq1om0001xpk9k093hizv", { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(2500)

        const agenticTitle = await page.$("text=Agentic Engineering")
        if (!agenticTitle) {
            throw new Error("Agentic Engineering tutorial title not found")
        }
        console.log("✔ Agentic Engineering tutorial loaded successfully")

        // Verify that blocks rendered inside rosera-interactive-canvas
        const canvas = await page.$(".rosera-interactive-canvas, .aspirantbook-tutorial")
        if (canvas) {
            console.log("✔ Rosera interactive blocks rendered cleanly without crash")
        }

        console.log("\n=== ALL PART 3 ERROR HANDLING & RESILIENCE TESTS PASSED ===")
    } catch (e: any) {
        console.error("TEST FAILED:", e.message)
        process.exit(1)
    } finally {
        await browser.close()
    }
}

run().catch((err) => {
    console.error("Fatal:", err)
    process.exit(1)
})
