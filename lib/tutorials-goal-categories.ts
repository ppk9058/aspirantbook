import goalsConfig from "@/data/goals-config.json"

export interface GoalCategoryOption {
    name: string
    slug: string
    goalId: string
    isPopular?: boolean
}

/**
 * Required standard categories according to specification:
 * UPSC, BPSC, BPSC TRE, SSC, Class 12, Class 11th, Class 10th, Class 9th, Class 8th, Skill & Tech
 * Plus all other goals configured in the app's Global Goal configuration.
 */
export const REQUIRED_GOAL_CATEGORIES: GoalCategoryOption[] = [
    { name: "UPSC", slug: "upsc", goalId: "upsc", isPopular: true },
    { name: "BPSC", slug: "bpsc", goalId: "bpsc", isPopular: true },
    { name: "BPSC TRE", slug: "bpsc-tre", goalId: "bpsc", isPopular: true },
    { name: "SSC", slug: "ssc", goalId: "ssc", isPopular: true },
    { name: "Class 12", slug: "class-12", goalId: "class-12" },
    { name: "Class 11th", slug: "class-11", goalId: "class-11" },
    { name: "Class 10th", slug: "class-10", goalId: "class-10", isPopular: true },
    { name: "Class 9th", slug: "class-9", goalId: "class-9", isPopular: true },
    { name: "Class 8th", slug: "class-8", goalId: "class-8", isPopular: true },
    { name: "Skill & Tech", slug: "skills", goalId: "skills", isPopular: true },
    // Also include any other goals from goals-config.json to match exactly
    { name: "Class 7th", slug: "class-7", goalId: "class-7" },
    { name: "Class 6th", slug: "class-6", goalId: "class-6" },
    { name: "UPPSC", slug: "uppsc", goalId: "uppsc" },
    { name: "MPPSC", slug: "mppsc", goalId: "mppsc" },
    { name: "IIT JEE", slug: "jee", goalId: "jee" },
    { name: "NEET UG", slug: "neet", goalId: "neet" },
    { name: "Banking Exams", slug: "banking", goalId: "banking" },
    { name: "Railways", slug: "railways", goalId: "railways" },
    { name: "Data Science & AI", slug: "data-science", goalId: "data-science" },
    { name: "DSA & Coding Interviews", slug: "dsa-interview", goalId: "dsa-interview" },
]

/**
 * Returns whether a tutorial category matches a student's active Global Goal ID.
 */
export function doesCategoryMatchGoal(category: string | null | undefined, goalId: string | null | undefined): boolean {
    if (!goalId) return true // No goal set: show all
    if (!category || !category.trim()) return false // Uncategorized hidden for goal-filtered students

    const normalizedGoal = goalId.trim().toLowerCase()
    const parts = category.toLowerCase().split(",").map(p => p.trim())

    for (const part of parts) {
        if (!part) continue

        // Direct matching
        if (part === normalizedGoal) return true

        // Goal-specific matching logic
        if (normalizedGoal === "upsc" && (part.includes("upsc") || part.includes("civil services"))) {
            return true
        }
        if (normalizedGoal === "bpsc") {
            if (part.includes("bpsc")) return true
        }
        if (normalizedGoal === "bpsc-tre" || normalizedGoal === "tre") {
            if (part.includes("bpsc tre") || part.includes("tre")) return true
        }
        if (normalizedGoal === "ssc" && (part.includes("ssc") || part.includes("govt"))) {
            return true
        }
        if (normalizedGoal === "skills" || normalizedGoal === "skill & tech" || normalizedGoal === "tech") {
            if (
                part.includes("skill") ||
                part.includes("tech") ||
                part.includes("python") ||
                part.includes("ai") ||
                part.includes("coding") ||
                part.includes("data") ||
                part.includes("masterclass") ||
                part.includes("c")
            ) {
                return true
            }
        }
        if (normalizedGoal === "data-science" && (part.includes("data") || part.includes("ai") || part.includes("python"))) {
            return true
        }
        if (normalizedGoal === "dsa-interview" && (part.includes("dsa") || part.includes("coding") || part.includes("algo"))) {
            return true
        }
        if (normalizedGoal === "class-12" && (part.includes("class 12") || part.includes("12th"))) {
            return true
        }
        if (normalizedGoal === "class-11" && (part.includes("class 11") || part.includes("11th"))) {
            return true
        }
        if (normalizedGoal === "class-10" && (part.includes("class 10") || part.includes("10th"))) {
            return true
        }
        if (normalizedGoal === "class-9" && (part.includes("class 9") || part.includes("9th"))) {
            return true
        }
        if (normalizedGoal === "class-8" && (part.includes("class 8") || part.includes("8th"))) {
            return true
        }
        if (normalizedGoal === "class-7" && (part.includes("class 7") || part.includes("7th"))) {
            return true
        }
        if (normalizedGoal === "class-6" && (part.includes("class 6") || part.includes("6th"))) {
            return true
        }
        if (normalizedGoal === "jee" && (part.includes("jee") || part.includes("iit"))) {
            return true
        }
        if (normalizedGoal === "neet" && part.includes("neet")) {
            return true
        }
        if (normalizedGoal === "banking" && (part.includes("banking") || part.includes("bank"))) {
            return true
        }
        if (normalizedGoal === "railways" && (part.includes("railway") || part.includes("rrb"))) {
            return true
        }
    }

    return false
}
