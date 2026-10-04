import { chromium, Browser } from "playwright"
import fs from "fs"
import path from "path"

const BASE_URL = "http://localhost:3000"

const VIEWPORTS = [
    { name: "320x640", width: 320, height: 640 },
    { name: "360x740", width: 360, height: 740 },
    { name: "390x844", width: 390, height: 844 },
    { name: "430x932", width: 430, height: 932 },
    { name: "768x1024", width: 768, height: 1024 },
    { name: "1024x768", width: 1024, height: 768 },
    { name: "1440x900", width: 1440, height: 900 },
    { name: "844x390", width: 844, height: 390 }, // landscape phone
]

interface ScreenDef {
    name: string
    path: string
    sourceFiles: string[]
    roles: ("rich" | "empty" | "teacher" | "guest")[]
    zoomCheck?: boolean
}

const SCREENS: ScreenDef[] = [
    {
        name: "Home/dashboard",
        path: "/dashboard",
        sourceFiles: ["app/(dashboard)/dashboard/page.tsx", "components/layout/MobileAppHeader.tsx", "components/layout/MobileNativeBottomBar.tsx"],
        roles: ["rich", "empty"],
        zoomCheck: true,
    },
    {
        name: "Test Series hub",
        path: "/test-series",
        sourceFiles: ["app/(dashboard)/test-series/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Test series detail",
        path: "/test-series/bpsc-72nd-2026",
        sourceFiles: ["app/(dashboard)/test-series/[id]/page.tsx"],
        roles: ["rich", "empty"],
        zoomCheck: true,
    },
    {
        name: "My Tests",
        path: "/test-series/my-tests",
        sourceFiles: ["app/(dashboard)/test-series/my-tests/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Courses list",
        path: "/courses",
        sourceFiles: ["app/(dashboard)/courses/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Course detail",
        path: "/courses/ai-course",
        sourceFiles: ["app/(dashboard)/courses/[slug]/page.tsx", "app/(dashboard)/courses/[slug]/CourseDetailView.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Video lesson",
        path: "/courses/ai-course-test/learn/cmtyvtcpw0001xpkavr4ccgnw",
        sourceFiles: ["app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx", "components/course/CoursePlayerClient.tsx"],
        roles: ["rich", "empty"],
        zoomCheck: true,
    },
    {
        name: "Tutorials list",
        path: "/tutorials",
        sourceFiles: ["app/(dashboard)/tutorials/page.tsx", "app/(dashboard)/tutorials/TutorialsClientView.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Tutorial reader",
        path: "/courses/generative-ai",
        sourceFiles: ["components/editor/AspirantbookTutorialView.tsx", "components/editor/RoseraModernReader.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "PYQs",
        path: "/pyqs",
        sourceFiles: ["app/(dashboard)/pyqs/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Current Affairs",
        path: "/current-affairs-quizzes",
        sourceFiles: ["app/(dashboard)/current-affairs-quizzes/page.tsx", "components/quizzes/CurrentAffairsQuizzesClient.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Profile",
        path: "/profile",
        sourceFiles: ["app/(dashboard)/profile/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Subscription/Pricing",
        path: "/subscription",
        sourceFiles: ["app/(dashboard)/subscription/page.tsx", "app/pricing/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Search",
        path: "/search",
        sourceFiles: ["app/(dashboard)/search/page.tsx"],
        roles: ["rich", "empty"],
    },
    {
        name: "Login",
        path: "/login",
        sourceFiles: ["app/(auth)/login/page.tsx", "components/auth/LoginForm.tsx"],
        roles: ["guest"],
    },
    {
        name: "Signup",
        path: "/register",
        sourceFiles: ["app/(auth)/register/page.tsx", "components/auth/RegisterForm.tsx"],
        roles: ["guest"],
    },
    {
        name: "Tutorial Studio list",
        path: "/admin/tutorials",
        sourceFiles: ["app/admin/tutorials/page.tsx"],
        roles: ["teacher"],
    },
    {
        name: "Create Tutorial",
        path: "/admin/tutorials/new",
        sourceFiles: ["app/admin/tutorials/new/page.tsx"],
        roles: ["teacher"],
    },
]

async function inspectPage(page: any) {
    return await page.evaluate(() => {
        const docEl = document.documentElement
        const innerWidth = window.innerWidth
        const innerHeight = window.innerHeight
        const scrollWidth = docEl.scrollWidth

        // 1. Horizontal overflow
        const hasHorizontalOverflow = scrollWidth > innerWidth + 1
        const overflowingElements: { selector: string; right: number; width: number; text: string }[] = []
        if (hasHorizontalOverflow) {
            const all = document.querySelectorAll("*")
            for (let i = 0; i < all.length; i++) {
                const el = all[i]
                const r = el.getBoundingClientRect()
                if (r.right > innerWidth + 2 && r.width > 0 && r.height > 0) {
                    const sel = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "")
                    overflowingElements.push({
                        selector: sel,
                        right: Math.round(r.right),
                        width: Math.round(r.width),
                        text: (el.textContent || "").trim().slice(0, 40),
                    })
                    if (overflowingElements.length >= 6) break
                }
            }
        }

        // 2. Cut-off text
        const cutoffElements: { selector: string; text: string; issue: string }[] = []
        const textNodes = document.querySelectorAll("h1, h2, h3, h4, p, span, button, a")
        for (let i = 0; i < textNodes.length; i++) {
            const el = textNodes[i] as HTMLElement
            const cs = window.getComputedStyle(el)
            if (cs.overflow === "hidden" || cs.textOverflow === "ellipsis") {
                if (el.scrollWidth > el.clientWidth + 2 && !el.getAttribute("title")) {
                    const sel = el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "")
                    cutoffElements.push({
                        selector: sel,
                        text: (el.innerText || "").trim().slice(0, 30),
                        issue: `Truncated without title tooltip: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
                    })
                    if (cutoffElements.length >= 4) break
                }
            }
        }

        // 3. Small tap targets (< 44px)
        const smallTapTargets: { tag: string; selector: string; width: number; height: number; text: string }[] = []
        const interactive = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"]')
        for (let i = 0; i < interactive.length; i++) {
            const el = interactive[i] as HTMLElement
            const r = el.getBoundingClientRect()
            if (r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0) {
                if (r.width < 44 || r.height < 44) {
                    const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 30)
                    const sel = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "")
                    smallTapTargets.push({
                        tag: el.tagName.toLowerCase(),
                        selector: sel,
                        width: Math.round(r.width),
                        height: Math.round(r.height),
                        text,
                    })
                }
            }
        }

        // 4. Bottom bar / sticky overlap
        let bottomBarOverlap = false
        let bottomBarDetails = ""
        const bottomBar = document.querySelector('nav[class*="fixed"][class*="bottom-0"], div[class*="fixed"][class*="bottom-0"]')
        if (bottomBar && window.innerWidth < 1024) {
            const barRect = bottomBar.getBoundingClientRect()
            const mainEl = document.querySelector("main") || document.querySelector("#__next") || document.body
            const computed = window.getComputedStyle(mainEl)
            const pb = parseInt(computed.paddingBottom || "0", 10)
            if (barRect.height > 0 && pb < barRect.height - 8) {
                bottomBarOverlap = true
                bottomBarDetails = `Fixed bottom bar (${Math.round(barRect.height)}px) overlaps main content (padding-bottom is only ${pb}px)`
            }
        }

        // 5. Floating buttons overlap
        const fabs = Array.from(document.querySelectorAll('button[class*="fixed"], div[class*="fixed"] button, [class*="bottom-"][class*="fixed"]')).filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && r.bottom > innerHeight - 120
        })
        let fabOverlap = false
        let fabOverlapDetails = ""
        for (let i = 0; i < fabs.length; i++) {
            for (let j = i + 1; j < fabs.length; j++) {
                const r1 = fabs[i].getBoundingClientRect()
                const r2 = fabs[j].getBoundingClientRect()
                const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom)
                if (overlap) {
                    fabOverlap = true
                    fabOverlapDetails = `Floating elements overlap each other at bottom right`
                    break
                }
            }
        }

        // 6. Hardcoded pure black or hex
        let hasPureBlack = false
        const blackNodes: string[] = []
        const sampleEls = Array.from(document.querySelectorAll("div, p, span, h1, h2, h3, a, button, section, header, nav")).slice(0, 60)
        for (const el of sampleEls) {
            const cs = window.getComputedStyle(el)
            if (cs.color === "rgb(0, 0, 0)" && cs.opacity === "1") {
                hasPureBlack = true
                blackNodes.push(`text pure black: ${el.tagName.toLowerCase()}`)
            }
            if (cs.backgroundColor === "rgb(0, 0, 0)") {
                hasPureBlack = true
                blackNodes.push(`bg pure black: ${el.tagName.toLowerCase()}`)
            }
        }

        // 7. Duplicate headers
        const h1s = Array.from(document.querySelectorAll("h1")).map((h) => (h.innerText || "").trim()).filter(Boolean)
        const duplicateHeaders = h1s.length > 1 ? h1s : []

        // 8. Tables not adapted
        const nonResponsiveTables: string[] = []
        const tables = Array.from(document.querySelectorAll("table"))
        for (const t of tables) {
            const parent = t.parentElement
            const parentOverflow = parent ? window.getComputedStyle(parent).overflowX : ""
            if (parentOverflow !== "auto" && parentOverflow !== "scroll" && t.getBoundingClientRect().width > innerWidth) {
                nonResponsiveTables.push(`table width ${Math.round(t.getBoundingClientRect().width)}px unconstrained`)
            }
        }

        // 9. Fake placeholder numbers
        const bodyText = document.body.innerText || ""
        const fakePlaceholders: string[] = []
        if (bodyText.includes("1,280") && bodyText.includes("candidates")) fakePlaceholders.push("1,280 candidates placeholder")
        if (bodyText.includes("4.9 (12,450 reviews)")) fakePlaceholders.push("Hardcoded 4.9 (12,450 reviews)")
        if (bodyText.includes("50,000+ Enrolled")) fakePlaceholders.push("Hardcoded 50,000+ Enrolled")

        // 10. Dev-only indicators
        const hasDevAlerts = bodyText.includes("Set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET") || bodyText.includes("dev-only") || bodyText.includes("DEMO MODE")

        return {
            hasHorizontalOverflow,
            scrollWidth,
            innerWidth,
            overflowingElements,
            cutoffElements,
            smallTapTargetsCount: smallTapTargets.length,
            smallTapTargets: smallTapTargets.slice(0, 8),
            bottomBarOverlap,
            bottomBarDetails,
            fabOverlap,
            fabOverlapDetails,
            duplicateHeaders,
            hasPureBlack,
            blackNodes: blackNodes.slice(0, 3),
            nonResponsiveTables,
            fakePlaceholders,
            hasDevAlerts,
            bodySnippet: bodyText.slice(0, 150).replace(/\s+/g, " "),
        }
    })
}

async function runAudit() {
    console.log("🚀 Starting Responsive Audit with concurrency...")
    fs.mkdirSync("audit/screenshots", { recursive: true })

    const browser = await chromium.launch({ headless: true })
    const allResults: any[] = []

    // Build task queue
    type Task = {
        screen: ScreenDef
        role: "rich" | "empty" | "teacher" | "guest"
        vp: typeof VIEWPORTS[0]
        theme: "light" | "dark"
    }

    const tasks: Task[] = []
    for (const screen of SCREENS) {
        for (const role of screen.roles) {
            for (const vp of VIEWPORTS) {
                for (const theme of ["light", "dark"] as const) {
                    tasks.push({ screen, role, vp, theme })
                }
            }
        }
    }

    console.log(`Total inspection tasks: ${tasks.length}`)

    // Run with worker pool of 4
    const WORKER_COUNT = 4
    let taskIdx = 0

    async function worker(workerId: number) {
        while (taskIdx < tasks.length) {
            const currentIdx = taskIdx++
            const task = tasks[currentIdx]
            const { screen, role, vp, theme } = task

            let storageStatePath: string | undefined = undefined
            if (role === "rich") storageStatePath = ".auth/student-audit.json"
            else if (role === "empty") storageStatePath = ".auth/student-empty.json"
            else if (role === "teacher") storageStatePath = ".auth/teacher-audit.json"

            let context: any
            try {
                context = await browser.newContext({
                    viewport: { width: vp.width, height: vp.height },
                    storageState: storageStatePath,
                    colorScheme: theme,
                })
                const page = await context.newPage()

                const res = await page.goto(`${BASE_URL}${screen.path}`, {
                    waitUntil: "domcontentloaded",
                    timeout: 25000,
                })
                await page.waitForTimeout(600)

                const diag = await inspectPage(page)

                let zoomDiag: any = null
                if (screen.zoomCheck && vp.name === "390x844" && theme === "light" && role === "rich") {
                    await page.evaluate(() => {
                        ;(document.body.style as any).zoom = "200%"
                    })
                    await page.waitForTimeout(500)
                    zoomDiag = await inspectPage(page)
                }

                // Screenshot criteria for "blocks use":
                // 1) Horizontal overflow on phone (width <= 430)
                // 2) Bottom bar overlap blocking primary action
                // 3) Content breaking flow or floating buttons colliding
                const isBlocker = (diag.hasHorizontalOverflow && vp.width <= 430) || diag.bottomBarOverlap || diag.fabOverlap
                let screenshotPath: string | undefined = undefined

                if (isBlocker && (vp.name === "320x640" || vp.name === "360x740" || vp.name === "844x390")) {
                    const screenSlug = screen.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
                    screenshotPath = `audit/screenshots/${screenSlug}_${vp.name}_${theme}_${role}.png`
                    if (!fs.existsSync(screenshotPath)) {
                        await page.screenshot({ path: screenshotPath, fullPage: false })
                        console.log(`[W${workerId}] 📸 Captured BLOCKER screenshot: ${screenshotPath}`)
                    }
                }

                allResults.push({
                    screen: screen.name,
                    path: screen.path,
                    sourceFiles: screen.sourceFiles,
                    role,
                    viewport: vp.name,
                    width: vp.width,
                    height: vp.height,
                    theme,
                    diag,
                    zoomDiag,
                    screenshotPath,
                    statusCode: res?.status(),
                })

                if (currentIdx % 20 === 0 || isBlocker) {
                    console.log(`[W${workerId}] Progress: ${currentIdx + 1}/${tasks.length} | ${screen.name} (${vp.name}, ${theme}, ${role}) -> overflow: ${diag.hasHorizontalOverflow}, smallTap: ${diag.smallTapTargetsCount}`)
                }
            } catch (err: any) {
                console.error(`[W${workerId}] Error on ${screen.name} (${vp.name}, ${theme}, ${role}):`, err.message)
                allResults.push({
                    screen: screen.name,
                    path: screen.path,
                    role,
                    viewport: vp.name,
                    theme,
                    error: err.message,
                })
            } finally {
                if (context) await context.close().catch(() => {})
            }
        }
    }

    await Promise.all(Array.from({ length: WORKER_COUNT }, (_, i) => worker(i + 1)))

    await browser.close()
    fs.writeFileSync("audit/comprehensive_audit_results.json", JSON.stringify(allResults, null, 2))
    console.log(`\n🎉 Audit completed! Total checks: ${allResults.length}. Results written to audit/comprehensive_audit_results.json`)
}

runAudit().catch(console.error)
