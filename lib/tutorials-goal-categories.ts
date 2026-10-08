import goalsConfig from "@/data/goals-config.json"

export interface GoalCategoryOption {
    name: string
    slug: string
    goalId: string
    isPopular?: boolean
}

/**
 * Canonical goal list across the application.
 */
export const REQUIRED_GOAL_CATEGORIES: GoalCategoryOption[] = [
    { name: "UPSC", slug: "upsc", goalId: "upsc", isPopular: true },
    { name: "BPSC", slug: "bpsc", goalId: "bpsc", isPopular: true },
    { name: "BPSC TRE", slug: "bpsc-tre", goalId: "bpsc", isPopular: true },
    { name: "SSC", slug: "ssc", goalId: "ssc", isPopular: true },
    { name: "Govt. Exams", slug: "govt-exams", goalId: "govt-exams" },
    { name: "Class 12", slug: "class-12", goalId: "class-12" },
    { name: "Class 11th", slug: "class-11", goalId: "class-11" },
    { name: "Class 10th", slug: "class-10", goalId: "class-10", isPopular: true },
    { name: "Class 9th", slug: "class-9", goalId: "class-9", isPopular: true },
    { name: "Class 8th", slug: "class-8", goalId: "class-8", isPopular: true },
    { name: "Class 7th", slug: "class-7", goalId: "class-7" },
    { name: "Class 6th", slug: "class-6", goalId: "class-6" },
    { name: "Skill & Tech", slug: "skills", goalId: "skills", isPopular: true },
    { name: "Data Science & AI", slug: "data-science", goalId: "data-science" },
    { name: "DSA & Coding Interviews", slug: "dsa-interview", goalId: "dsa-interview" },
    { name: "UPPSC", slug: "uppsc", goalId: "uppsc" },
    { name: "MPPSC", slug: "mppsc", goalId: "mppsc" },
    { name: "IIT JEE", slug: "jee", goalId: "jee" },
    { name: "NEET UG", slug: "neet", goalId: "neet" },
    { name: "Banking Exams", slug: "banking", goalId: "banking" },
    { name: "Railways", slug: "railways", goalId: "railways" },
]

export const CANONICAL_GOAL_SLUGS = new Set(REQUIRED_GOAL_CATEGORIES.map((g) => g.slug))

/**
 * Normalized goal names mapping to canonical goal slugs.
 */
const CANONICAL_NAME_MAP: Record<string, string[]> = {
    "upsc": ["upsc"],
    "upsc cse": ["upsc"],
    "bpsc": ["bpsc"],
    "bpsc tre": ["bpsc-tre", "bpsc"],
    "ssc": ["ssc", "govt-exams"],
    "govt exams": ["govt-exams", "ssc"],
    "govt. exams": ["govt-exams", "ssc"],
    "class 12": ["class-12"],
    "class 12th": ["class-12"],
    "class 11": ["class-11"],
    "class 11th": ["class-11"],
    "class 10": ["class-10"],
    "class 10th": ["class-10"],
    "class 9": ["class-9"],
    "class 9th": ["class-9"],
    "class 8": ["class-8"],
    "class 8th": ["class-8"],
    "class 7": ["class-7"],
    "class 7th": ["class-7"],
    "class 6": ["class-6"],
    "class 6th": ["class-6"],
    "skill & tech": ["skills"],
    "skills & tech": ["skills"],
    "skills": ["skills"],
    "tech": ["skills"],
    "data science & ai": ["data-science", "skills"],
    "data science": ["data-science", "skills"],
    "dsa & coding interviews": ["dsa-interview", "skills"],
    "uppsc": ["uppsc"],
    "mppsc": ["mppsc"],
    "iit jee": ["jee"],
    "jee": ["jee"],
    "neet ug": ["neet"],
    "neet": ["neet"],
    "banking exams": ["banking"],
    "banking": ["banking"],
    "railways": ["railways"],
    "railway": ["railways"],
}

/**
 * Explicit alias map: maps exact trimmed, lowercased tokens to canonical goal slugs.
 * NO arbitrary substring matching.
 */
const EXPLICIT_ALIAS_MAP: Record<string, string[]> = {
    // Skills & Tech / Data Science aliases
    "ai": ["skills", "data-science"],
    "gen ai": ["skills", "data-science"],
    "genai": ["skills", "data-science"],
    "generative ai": ["skills", "data-science"],
    "generative ai & llm systems engineering": ["skills", "data-science"],
    "autonomous agents & multi-agent systems": ["skills", "data-science"],
    "autonomous agents": ["skills", "data-science"],
    "prompt engineering": ["skills", "data-science"],
    "deep learning": ["skills", "data-science"],
    "machine learning": ["skills", "data-science"],
    "ml": ["skills", "data-science"],
    "python": ["skills", "data-science"],
    "c": ["skills"], // "C" matches skills ONLY as an exact token
    "c++": ["skills"],
    "cpp": ["skills"],
    "java": ["skills"],
    "javascript": ["skills"],
    "typescript": ["skills"],
    "coding": ["skills"],
    "programming": ["skills"],
    "dsa": ["skills", "dsa-interview"],
    "algo": ["skills", "dsa-interview"],
    "algorithms": ["skills", "dsa-interview"],

    // Civil services & PSC aliases
    "civil services": ["upsc"],
    "bihar": ["bpsc"],
    "bihar special": ["bpsc"],
    "tre": ["bpsc-tre", "bpsc"],

    // Govt exams aliases
    "cgl": ["ssc", "govt-exams"],
    "ssc cgl": ["ssc", "govt-exams"],
    "railway rrb": ["railways"],
    "rrb": ["railways"],
    "bank": ["banking"],
    "bank po": ["banking"],

    // Engineering & Medical
    "iit": ["jee"],
    "medical": ["neet"],
}

/**
 * Resolves a token/subject to canonical goal slugs.
 */
export function resolveTokenToCanonicalGoals(token: string): string[] {
    const normalized = token.trim().toLowerCase()
    if (!normalized) return []

    // 1. Direct canonical goal slug
    if (CANONICAL_GOAL_SLUGS.has(normalized)) {
        return [normalized]
    }

    // 2. Canonical goal name match
    if (CANONICAL_NAME_MAP[normalized]) {
        return CANONICAL_NAME_MAP[normalized]
    }

    // 3. Explicit alias map match
    if (EXPLICIT_ALIAS_MAP[normalized]) {
        return EXPLICIT_ALIAS_MAP[normalized]
    }

    return []
}

/**
 * Returns whether a tutorial category matches a student's active Global Goal ID.
 * Strict exact token matching after comma-split and normalization.
 * NO arbitrary substring checks like part.includes("c").
 */
export function doesCategoryMatchGoal(
    category: string | null | undefined,
    goalId: string | null | undefined
): boolean {
    if (!goalId) return true // No goal set: show all
    if (!category || !category.trim()) return false // Uncategorized hidden for goal-filtered students

    const normalizedGoal = goalId.trim().toLowerCase()
    const tokens = category
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean)

    for (const token of tokens) {
        // Direct exact match against target goal
        if (token === normalizedGoal) return true

        // Resolve token to canonical goals via name map or explicit aliases
        const mappedGoals = resolveTokenToCanonicalGoals(token)
        if (mappedGoals.includes(normalizedGoal)) {
            return true
        }
    }

    return false
}

/**
 * Validates or maps an arbitrary subject/category string into canonical goal slugs.
 * Used by admin forms and tutorial package importer.
 */
export function validateOrMapCanonicalGoals(input: string | null | undefined): {
    validSlugs: string[]
    isValid: boolean
    error?: string
} {
    if (!input || !input.trim()) {
        return {
            validSlugs: [],
            isValid: false,
            error: "Category is required: must specify at least one canonical goal",
        }
    }

    const tokens = input
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

    const resolved = new Set<string>()

    for (const token of tokens) {
        const goals = resolveTokenToCanonicalGoals(token)
        if (goals.length > 0) {
            goals.forEach((g) => resolved.add(g))
        }
    }

    const validSlugs = Array.from(resolved)

    if (validSlugs.length === 0) {
        return {
            validSlugs: [],
            isValid: false,
            error: `Category required: '${input}' is not a recognized canonical goal. Valid goals: ${Array.from(CANONICAL_GOAL_SLUGS).join(", ")}`,
        }
    }

    return {
        validSlugs,
        isValid: true,
    }
}
