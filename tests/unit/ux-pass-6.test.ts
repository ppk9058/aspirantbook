import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readRepoFile(relPath: string): string {
    return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8")
}

describe("UX Pass 6 - Part A: /pricing Section Order & Content", () => {
    it("renders Benefits Card before Price Card, and Price Card before FAQ", () => {
        const pricing = readRepoFile("app/pricing/page.tsx")

        const benefitsIdx = pricing.indexOf("Pass Benefits")
        const priceCardIdx = pricing.indexOf("Yearly aspirantBook Pass")
        const faqIdx = pricing.indexOf("Frequently Asked Questions")

        assert.ok(benefitsIdx > 0, "Benefits Card heading missing")
        assert.ok(priceCardIdx > 0, "Price Card heading missing")
        assert.ok(faqIdx > 0, "FAQ section heading missing")

        assert.ok(benefitsIdx < priceCardIdx, "Benefits Card must be placed before Price Card")
        assert.ok(priceCardIdx < faqIdx, "Price Card must be placed before FAQ section")
    })

    it("includes Razorpay trust line with payment methods", () => {
        const pricing = readRepoFile("app/pricing/page.tsx")
        assert.match(
            pricing,
            /Secure payment powered by Razorpay.*UPI.*Cards.*Net Banking/i,
            "Razorpay trust text with payment methods missing"
        )
    })

    it("PassFAQAccordion renders styled sequential badges and links to /refund", () => {
        const faq = readRepoFile("components/pricing/PassFAQAccordion.tsx")
        assert.match(faq, /\{index \+ 1\}/, "Numbered badge missing from FAQ accordion")
        assert.match(faq, /href="\/refund"/, "FAQ must link to /refund (Cancellation & Refund Policy)")
        assert.doesNotMatch(faq, /href="\/refund-policy"/, "Stale /refund-policy link must not exist")
    })
})

describe("UX Pass 6 - Part B: Email Confirmation Alert Removed", () => {
    it("UnverifiedEmailBanner returns null unconditionally", () => {
        const banner = readRepoFile("components/auth/UnverifiedEmailBanner.tsx")
        assert.match(banner, /return null/, "UnverifiedEmailBanner must return null")
        assert.doesNotMatch(banner, /Your email.*is not verified/, "Banner must not render unverified warning")
    })

    it("DashboardShell does not render UnverifiedEmailBanner", () => {
        const shell = readRepoFile("components/layout/DashboardShell.tsx")
        assert.doesNotMatch(shell, /<UnverifiedEmailBanner/, "DashboardShell must not render UnverifiedEmailBanner")
    })

    it("Teacher test-series dashboard does not render email verification banner", () => {
        const teacherPage = readRepoFile("app/(dashboard)/teacher/test-series/page.tsx")
        assert.doesNotMatch(teacherPage, /data-testid="email-verification-banner"/, "Teacher email banner must be removed")
    })
})

describe("UX Pass 6 - Part C: CBT Instructions & Declaration", () => {
    it("instructions page renders aspirantBook brand and declaration link", () => {
        const instructions = readRepoFile("app/(exam)/test-series/[id]/instructions/InstructionsClient.tsx")
        assert.match(instructions, /BrandLogo/, "BrandLogo must be used in CBT instructions header")
        assert.match(instructions, /General Assessment Guidelines/, "Guidelines title missing")
        assert.match(instructions, /declarationHref/, "Link to declaration missing")
    })

    it("declaration page renders checkbox, start button, and original text", () => {
        const declaration = readRepoFile("app/(exam)/test-series/[id]/declaration/page.tsx")
        assert.match(declaration, /data-testid="declaration-checkbox"/, "declaration-checkbox testId missing")
        assert.match(declaration, /I have read and understood/, "Declaration text requirement missing")
        assert.match(declaration, /I am ready to begin/, "Start button text missing")
        assert.match(declaration, /BrandLogo/, "BrandLogo must be used in CBT declaration header")
    })
})

describe("UX Pass 6 - Part D: Goal Selector Text", () => {
    it("GoalModal uses 'Select Target' as its heading", () => {
        const modal = readRepoFile("components/layout/GoalModal.tsx")
        assert.match(modal, /Select Target/, "GoalModal must display 'Select Target'")
        assert.doesNotMatch(modal, /Select your Target Exams &amp; Goals/, "Old verbose goal modal heading must be gone")
    })

    it("GoalSelectorButton uses 'Select Target'", () => {
        const btn = readRepoFile("components/layout/GoalSelectorButton.tsx")
        assert.match(btn, /title="Select Target"/, "GoalSelectorButton title must be 'Select Target'")
        assert.match(btn, /aria-label="Select Target"/, "GoalSelectorButton aria-label must be 'Select Target'")
    })

    it("MobileDrawer uses 'Select Target'", () => {
        const drawer = readRepoFile("components/layout/MobileDrawer.tsx")
        assert.match(drawer, /Select Target/, "MobileDrawer goal section must display 'Select Target'")
        assert.doesNotMatch(drawer, /Target Goal/, "MobileDrawer must not display 'Target Goal'")
    })

    it("GoalSelectorBar default title is 'Select Target'", () => {
        const bar = readRepoFile("components/goals/GoalSelectorBar.tsx")
        assert.match(bar, /title = "Select Target"/, "GoalSelectorBar default title must be 'Select Target'")
    })
})

describe("UX Pass 6 - Part E: CBT Fullscreen Esc Notice", () => {
    it("AttemptClient does not render an app-level 'Press Esc' banner", () => {
        const attempt = readRepoFile("app/(exam)/test-series/[id]/attempt/AttemptClient.tsx")
        assert.doesNotMatch(attempt, /press.*esc.*to exit/i, "AttemptClient must not render an app-level Esc hint banner")
        assert.doesNotMatch(attempt, /exit full screen.*toast/i, "AttemptClient must not toast Esc instructions")
    })
})

describe("UX Pass 6 - Part F: Student-Facing Social Proof & Learner Counts Hidden", () => {
    it("CourseCard hides learner count", () => {
        const card = readRepoFile("components/courses/CourseCard.tsx")
        assert.doesNotMatch(card, /learners`/, "CourseCard must not render learner counts")
    })

    it("CourseDetailView hides learner count", () => {
        const detail = readRepoFile("app/(dashboard)/courses/[slug]/CourseDetailView.tsx")
        assert.doesNotMatch(detail, /learners enrolled/, "CourseDetailView must not render learner count")
    })

    it("RecommendedCourses hides learner count", () => {
        const recommended = readRepoFile("components/dashboard/RecommendedCourses.tsx")
        assert.doesNotMatch(recommended, /learners`/, "RecommendedCourses must not render learner counts")
    })

    it("TestSeries cards hide user count badges", () => {
        const testSeriesPage = readRepoFile("app/(dashboard)/test-series/page.tsx")
        assert.doesNotMatch(testSeriesPage, /formatCount\(item\.users, "User"\)/, "TestSeries cards must not render user counts")
        assert.doesNotMatch(testSeriesPage, /Active Learners/, "TestSeries modal must not display Active Learners count")
    })

    it("TestSeries detail page hides user count", () => {
        const detailClient = readRepoFile("app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx")
        assert.doesNotMatch(detailClient, /\{seriesData\.users\} User/, "TestSeriesDetailClient must not display Users count")
        assert.doesNotMatch(detailClient, /\{test\.attempts\} Attempts/, "TestSeriesDetailClient must not display Attempts count")
    })

    it("MyTestsHubClient hides user enrollment counts", () => {
        const myTests = readRepoFile("components/test-series/MyTestsHubClient.tsx")
        assert.doesNotMatch(myTests, /formatCount\(item\.users, "user"\) enrolled/, "MyTestsHubClient must not display enrolled user counts")
    })

    it("BookDetailsClient hides ratings/reviews count", () => {
        const bookDetails = readRepoFile("components/books/BookDetailsClient.tsx")
        assert.doesNotMatch(bookDetails, /ratings and.*reviews/, "BookDetailsClient must not render rating and review counts")
        assert.doesNotMatch(bookDetails, /Reviews \(\{book\.reviewCount\}\)/, "BookDetailsClient must not render review count in tab")
    })

    it("BookCard hides rating badge", () => {
        const bookCard = readRepoFile("components/books/BookCard.tsx")
        assert.doesNotMatch(bookCard, /book\.rating && book\.rating > 0/, "BookCard must not render rating badge")
    })
})
