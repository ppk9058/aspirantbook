import { chromium, BrowserContext, Page } from "playwright"
import fs from "fs"
import path from "path"

const TARGET_ROUTES = [
    { name: "dashboard", path: "/dashboard" },
    { name: "courses", path: "/courses" },
    { name: "course_detail", path: "/courses/72nd-bpsc-prelims-current-affairs" },
    { name: "course_learn", path: "/courses/72nd-bpsc-prelims-current-affairs/learn/cmui8hds90004xpacc9bropjd" },
    { name: "course_demo", path: "/courses/72nd-bpsc-prelims-current-affairs/demo" },
    { name: "my_learning", path: "/my-learning" },
    { name: "books", path: "/books" },
    { name: "tutorials", path: "/tutorials" },
]

const VIEWPORTS = [
    { name: "desktop_1440x900", width: 1440, height: 900 },
    { name: "mobile_390x844", width: 390, height: 844 },
]

export interface RouteInspection {
    target: string
    routePath: string
    viewport: string
    auth: "logged_in" | "logged_out"
    finalUrl: string
    hasTopNav: boolean
    hasMobileHeader: boolean
    hasLeftSidebar: boolean
    hasBottomNav: boolean
    hasBreadcrumbs: boolean
    hasChatbot: boolean
    mainClasses: string
    screenshotPath?: string
}

async function inspectPage(page: Page, route: { name: string; path: string }, vpName: string, auth: "logged_in" | "logged_out", outputDir: string, tag: string): Promise<RouteInspection> {
    const url = `http://localhost:3000${route.path}`
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForTimeout(1500)

    const finalUrl = page.url()

    const inspection = await page.evaluate(() => {
        // Top nav / header
        // Desktop TopNavBar has nav or header tag with ts-topnavbar or check links
        const topNavDesktop = document.querySelector("header, nav.fixed, nav.sticky, div.hidden.lg\\:block > nav, div.hidden.lg\\:block header")
        const mobileHeader = document.querySelector(".block.lg\\:hidden header, .block.lg\\:hidden nav, header.lg\\:hidden")
        
        // LeftSidebar
        const leftSidebar = document.querySelector("aside, [data-sidebar='true'], nav.hidden.lg\\:block.fixed")
        
        // BottomNav
        const bottomNav = document.querySelector("nav.fixed.bottom-0, [data-mobile-bottom-nav='true'], .lg\\:hidden.fixed.bottom-0")
        
        // Breadcrumbs
        const breadcrumbs = document.querySelector("nav[aria-label='Breadcrumb'], nav[aria-label='breadcrumbs'], ol.flex.items-center.gap-1\\.5")
        
        // Chatbot
        const chatbot = document.querySelector("button[aria-label*='Chat' i], button[aria-label*='AI' i], [data-chatbot='true'], div.fixed.bottom-6.right-6")

        // Main element
        const main = document.querySelector("main")
        const mainClasses = main ? main.className : ""

        return {
            hasTopNav: Boolean(topNavDesktop && window.getComputedStyle(topNavDesktop).display !== "none"),
            hasMobileHeader: Boolean(mobileHeader && window.getComputedStyle(mobileHeader).display !== "none"),
            hasLeftSidebar: Boolean(leftSidebar && window.getComputedStyle(leftSidebar).display !== "none"),
            hasBottomNav: Boolean(bottomNav && window.getComputedStyle(bottomNav).display !== "none"),
            hasBreadcrumbs: Boolean(breadcrumbs && window.getComputedStyle(breadcrumbs).display !== "none"),
            hasChatbot: Boolean(chatbot && window.getComputedStyle(chatbot).display !== "none"),
            mainClasses,
        }
    })

    const screenshotFilename = `${tag}_${route.name}_${vpName}_${auth}.png`
    const screenshotPath = path.join(outputDir, screenshotFilename)
    await page.screenshot({ path: screenshotPath, fullPage: false })

    return {
        target: route.name,
        routePath: route.path,
        viewport: vpName,
        auth,
        finalUrl,
        ...inspection,
        screenshotPath,
    }
}

export async function runShellInspection(tag: string, outputJsonPath: string, screenshotsDir: string) {
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true })
    }

    const browser = await chromium.launch({ headless: true })
    const results: RouteInspection[] = []

    try {
        for (const vp of VIEWPORTS) {
            // 1. Logged in student context
            const studentContext = await browser.newContext({
                viewport: { width: vp.width, height: vp.height },
                userAgent: vp.width < 1024
                    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                    : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            })
            const loginPage = await studentContext.newPage()
            await loginPage.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" })
            await loginPage.evaluate(async () => {
                const csrfRes = await fetch("/api/auth/csrf")
                const { csrfToken } = await csrfRes.json()
                await fetch("/api/auth/callback/credentials", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        email: "shell_audit_student@test.local",
                        password: "Password123!",
                        csrfToken,
                        callbackUrl: "http://localhost:3000/dashboard",
                        json: "true",
                    }),
                })
            })
            await loginPage.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" })
            await loginPage.waitForTimeout(1000)

            for (const route of TARGET_ROUTES) {
                console.log(`[${tag}] Checking ${route.name} (${vp.name}, logged_in)...`)
                const r = await inspectPage(loginPage, route, vp.name, "logged_in", screenshotsDir, tag)
                results.push(r)
            }
            await studentContext.close()

            // 2. Logged out visitor context
            const visitorContext = await browser.newContext({
                viewport: { width: vp.width, height: vp.height },
                userAgent: vp.width < 1024
                    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                    : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            })
            const visitorPage = await visitorContext.newPage()
            for (const route of TARGET_ROUTES) {
                console.log(`[${tag}] Checking ${route.name} (${vp.name}, logged_out)...`)
                const r = await inspectPage(visitorPage, route, vp.name, "logged_out", screenshotsDir, tag)
                results.push(r)
            }
            await visitorContext.close()
        }

        fs.writeFileSync(outputJsonPath, JSON.stringify(results, null, 2))
        console.log(`Saved ${results.length} inspection records to ${outputJsonPath}`)
    } finally {
        await browser.close()
    }
}

if (process.argv[1]?.endsWith("inspect-shell.ts")) {
    const tag = process.argv[2] || "head"
    const outJson = process.argv[3] || `/tmp/shell_inspection_${tag}.json`
    const screenshotsDir = `/tmp/ts_audit_screenshots_${tag}`
    runShellInspection(tag, outJson, screenshotsDir).catch((e) => {
        console.error(e)
        process.exit(1)
    })
}
