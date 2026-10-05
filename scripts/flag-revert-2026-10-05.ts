import { prisma } from "../lib/prisma"

// FIRST-AUDIT BASELINE VALUES (Target for 'apply'):
// Series: false / false
// Courses: 72nd and '3' isPremium = false
// Courses: generative-ai and ai-course-test isPremium = true

export const FIRST_AUDIT_STATE = {
    series: [
        { id: "bpsc-72nd-2026", isFree: false, isPro: false },
        { id: "upsc-prelims-2026", isFree: false, isPro: false },
    ],
    courses: [
        { slug: "72nd-bpsc-prelims-current-affairs", isPremium: false },
        { slug: "3", isPremium: false },
        { slug: "generative-ai", isPremium: true },
        { slug: "ai-course-test", isPremium: true },
    ],
}

// POST-ALIGNMENT / STEP 1694 STATE (Target for 'rollback'):
export const STEP_1694_STATE = {
    series: [
        { id: "bpsc-72nd-2026", isFree: true, isPro: false },
        { id: "upsc-prelims-2026", isFree: true, isPro: false },
    ],
    courses: [
        { slug: "72nd-bpsc-prelims-current-affairs", isPremium: true },
        { slug: "3", isPremium: true },
        { slug: "generative-ai", isPremium: false },
        { slug: "ai-course-test", isPremium: false },
    ],
}

export async function executeFlagRevert(mode: "dry-run" | "apply" | "rollback") {
    console.log(`[flag-revert] Executing in mode: ${mode.toUpperCase()}`)

    const targetState = mode === "rollback" ? STEP_1694_STATE : FIRST_AUDIT_STATE

    if (mode === "dry-run") {
        console.log("\n[DRY RUN] Would set the following values:")
        console.log("ExamSeries:")
        console.table(targetState.series)
        console.log("Courses:")
        console.table(targetState.courses)
        console.log("[DRY RUN] No database writes executed.")
        return
    }

    if (mode === "apply") {
        console.log("\n[APPLY] Reverting flags to First-Audit Baseline...")
        for (const s of targetState.series) {
            await prisma.examSeries.update({
                where: { id: s.id },
                data: { isFree: s.isFree, isPro: s.isPro },
            })
            console.log(`Updated series ${s.id}: isFree=${s.isFree}, isPro=${s.isPro}`)
        }
        for (const c of targetState.courses) {
            await prisma.course.update({
                where: { slug: c.slug },
                data: { isPremium: c.isPremium },
            })
            console.log(`Updated course ${c.slug}: isPremium=${c.isPremium}`)
        }
        console.log("[APPLY] Completed successfully.")
    } else if (mode === "rollback") {
        console.log("\n[ROLLBACK] Restoring flags to Step 1694 Alignment State...")
        for (const s of targetState.series) {
            await prisma.examSeries.update({
                where: { id: s.id },
                data: { isFree: s.isFree, isPro: s.isPro },
            })
            console.log(`Restored series ${s.id}: isFree=${s.isFree}, isPro=${s.isPro}`)
        }
        for (const c of targetState.courses) {
            await prisma.course.update({
                where: { slug: c.slug },
                data: { isPremium: c.isPremium },
            })
            console.log(`Restored course ${c.slug}: isPremium=${c.isPremium}`)
        }
        console.log("[ROLLBACK] Completed successfully.")
    }
}

// Guarded by require.main and defaults to dry-run
if (require.main === module) {
    const args = process.argv.slice(2)
    const mode = args.includes("--apply") ? "apply" : args.includes("--rollback") ? "rollback" : "dry-run"
    executeFlagRevert(mode)
        .catch((err) => {
            console.error("[flag-revert] Error:", err)
            process.exit(1)
        })
        .finally(() => prisma.$disconnect())
}
