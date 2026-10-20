import { doesCategoryMatchGoal } from "@/lib/tutorials-goal-categories"
import { isCourseMatchingGoal } from "@/lib/course-classifier"
import goalsConfig from "@/data/goals-config.json"

/**
 * Checks if a tutorial/course category matches ANY of the student's active goals (OR logic).
 */
export function doesCategoryMatchAnyGoal(
    category: string | null | undefined,
    goalIds: string[] | null | undefined
): boolean {
    if (!goalIds || goalIds.length === 0) return true
    return goalIds.some((gid) => doesCategoryMatchGoal(category, gid))
}

/**
 * Applies strict server-side multi-goal filtering to courses (OR logic).
 */
export function applyCourseGoalFilter<T extends { id?: string; title?: string; slug?: string; description?: string | null; technology?: string | null; tags?: string[]; category?: string | null; goalId?: string | null }>(
    courses: T[],
    goalIds: string[]
): T[] {
    if (!goalIds || goalIds.length === 0) return courses

    return courses.filter((c) => {
        // Find tags for each goal
        return goalIds.some((gid) => {
            const goalDef = goalsConfig.popularGoals.find((g) => g.id === gid) ||
                goalsConfig.categories.flatMap((cat) => cat.goals).find((g) => g.id === gid)
            const goalTags = (goalDef?.tags || []).map((t) => t.toLowerCase())

            // Use course classifier logic
            if (isCourseMatchingGoal(c as any, gid, goalTags)) return true

            // Also check technology/category field
            if (doesCategoryMatchGoal(c.technology || c.category, gid)) return true

            return false
        })
    })
}

/**
 * Applies strict server-side multi-goal filtering to test series items (OR logic).
 */
export function applyTestSeriesGoalFilter<T extends { id: string; title: string; category?: string; description?: string; tags?: string[]; goalId?: string; slug?: string }>(
    seriesList: T[],
    goalIds: string[]
): T[] {
    if (!goalIds || goalIds.length === 0) return seriesList

    return seriesList.filter((item) => {
        const iGoal = (item.goalId || "").toLowerCase()
        const iTags = (item.tags || []).map((t) => t.toLowerCase())
        const text = `${item.title} ${item.description || ""} ${item.category || ""} ${item.slug || ""}`.toLowerCase()

        return goalIds.some((gid) => {
            const normalized = gid.toLowerCase()

            if (normalized === "upsc") {
                const isBpscMismatch = text.includes("bpsc") || text.includes("bihar")
                if (isBpscMismatch) return false
                return (iGoal === "upsc" || iTags.includes("upsc") || text.includes("upsc") || text.includes("civil services"))
            }

            if (iGoal === normalized) return true
            if (normalized === "bpsc") {
                return iGoal === "bpsc" || iTags.includes("bpsc") || text.includes("bpsc") || text.includes("bihar")
            }
            if (normalized === "ssc" || normalized === "govt-exams") {
                return iGoal === "ssc" || iGoal === "govt-exams" || iTags.includes("ssc") || iTags.includes("govt-exams") ||
                    text.includes("ssc") || text.includes("cgl") || text.includes("banking") || text.includes("railway")
            }
            if (normalized.startsWith("class-")) {
                const clsNum = normalized.replace("class-", "")
                return iGoal === normalized || (item.category || "").includes(clsNum) ||
                    text.includes(`class ${clsNum}`) || text.includes(`${clsNum}th`)
            }
            if (normalized === "skills" || normalized === "tech") {
                return iGoal === "skills" || (item.category || "").toLowerCase().includes("skill") ||
                    text.includes("coding") || text.includes("programming") || text.includes("python") || text.includes("dsa")
            }

            // General keyword match
            return text.includes(normalized) || iTags.includes(normalized)
        })
    })
}

/**
 * Applies strict server-side multi-goal filtering to quizzes (OR logic).
 */
export function applyQuizGoalFilter<T extends { id: string; title: string; category?: string; tags?: string[]; testType?: string }>(
    quizzes: T[],
    goalIds: string[]
): T[] {
    if (!goalIds || goalIds.length === 0) return quizzes

    return quizzes.filter((q) => {
        if (
            (q.testType === "CURRENT_AFFAIRS" || q.category?.toLowerCase().includes("current affairs")) &&
            !q.title.toLowerCase().includes("upsc") &&
            !q.title.toLowerCase().includes("ssc") &&
            !q.title.toLowerCase().includes("bpsc") &&
            !(q.category || "").toLowerCase().includes("upsc") &&
            !(q.category || "").toLowerCase().includes("ssc") &&
            !(q.category || "").toLowerCase().includes("bpsc")
        ) {
            return true
        }

        const text = `${q.title} ${q.category || ""} ${q.tags?.join(" ") || ""}`.toLowerCase()

        return goalIds.some((gid) => {
            const normalized = gid.toLowerCase()
            if (normalized === "upsc") {
                return text.includes("upsc") || text.includes("national") || text.includes("economy") || text.includes("science") || text.includes("gs")
            }
            if (normalized === "bpsc") {
                return text.includes("bpsc") || text.includes("bihar")
            }
            if (normalized === "ssc") {
                return text.includes("ssc") || text.includes("cgl") || text.includes("general awareness")
            }
            if (normalized.startsWith("class-")) {
                const num = normalized.replace("class-", "")
                return text.includes(`class ${num}`) || text.includes(`${num}th`)
            }
            if (normalized === "skills") {
                return text.includes("tech") || text.includes("code") || text.includes("python") || text.includes("ai")
            }
            return text.includes(normalized)
        })
    })
}

/**
 * Applies strict multi-goal filtering to PYQ items (OR logic).
 */
export function applyPyqGoalFilter<T extends { id?: string; title?: string; category?: any; categoryLabel?: string; subjects?: string[]; subject?: string | null; subExam?: any }>(
    pyqs: T[],
    goalIds: string[]
): T[] {
    if (!goalIds || goalIds.length === 0) return pyqs

    return pyqs.filter((p) => {
        const catSlug = typeof p.category === "object" && p.category !== null ? (p.category.slug || p.category.name || "") : (typeof p.category === "string" ? p.category : "")
        const catName = typeof p.category === "object" && p.category !== null ? (p.category.name || "") : (p.categoryLabel || "")
        const subExamName = typeof p.subExam === "object" && p.subExam !== null ? (p.subExam.name || p.subExam.slug || "") : ""
        const pCat = catSlug.toLowerCase()
        const text = `${p.title || ""} ${catName} ${catSlug} ${subExamName} ${p.subject || ""} ${p.subjects?.join(" ") || ""}`.toLowerCase()

        return goalIds.some((gid) => {
            const normalized = gid.toLowerCase()
            if (pCat === normalized) return true
            if (normalized === "upsc") {
                return (pCat === "upsc" || text.includes("upsc")) && !text.includes("bpsc") && !text.includes("bihar")
            }
            if (normalized === "bpsc") {
                return pCat === "bpsc" || text.includes("bpsc") || text.includes("bihar")
            }
            if (normalized === "ssc") {
                return pCat === "ssc" || text.includes("ssc") || text.includes("cgl")
            }
            if (normalized.startsWith("class-")) {
                const num = normalized.replace("class-", "")
                return pCat.includes(num) || text.includes(`class ${num}`) || text.includes(`${num}th`)
            }
            return text.includes(normalized)
        })
    })
}
