/**
 * Centralized Course & Tutorial Classification Utility
 * Ensures clean separation between:
 * 1. Text-based tutorials (Tutorial Studio) vs Video-based courses
 * 2. Strict goal matching (UPSC, BPSC, School, Skills & Tech, Data Science & AI, DSA)
 *    so non-matching courses NEVER bleed into unrelated tracks.
 */

export interface RawCourseLike {
    id?: string
    title?: string | null
    slug?: string | null
    description?: string | null
    technology?: string | null
    category?: string | null
    subject?: string | null
    tags?: string[] | null
    goalId?: string | null
    chapters?: Array<{
        lessons?: Array<{
            type?: string | null
            videoUrl?: string | null
        }>
    }>
}

export interface ClassifiedCourseInfo {
    goalId: string
    category: string
    subject: string
    tags: string[]
    isTutorial: boolean
}

/**
 * Checks whether a course entry is actually a text-based reading tutorial
 * (authored in Tutorial Studio, or containing solely reading lessons).
 */
export function isTextTutorialCourse(course: RawCourseLike): boolean {
    const slug = (course.slug || "").toLowerCase().trim()
    const title = (course.title || "").toLowerCase().trim()

    // Explicit known text tutorial slugs
    if (
        slug === "intro-to-python" ||
        slug === "this-is-4th-tutorial" ||
        slug.includes("chapter-1-the-foundations-of-c") ||
        slug === "this-is-3rd-course" ||
        slug === "ai-course-test"
    ) {
        return true
    }

    // Inspect lessons if chapters are populated
    if (course.chapters && course.chapters.length > 0) {
        const allLessons = course.chapters.flatMap((ch) => ch.lessons || [])
        if (allLessons.length > 0) {
            const hasVideo = allLessons.some(
                (l) => l.type === "VIDEO" || (l.videoUrl && l.videoUrl.trim().length > 0)
            )
            if (!hasVideo) {
                return true
            }
        }
    }

    return false
}

/**
 * Classifies any database or synthetic course into its proper goal, category,
 * subject, tags, and tutorial status based on technology, title, and metadata.
 */
export function classifyCourse(course: RawCourseLike): ClassifiedCourseInfo {
    const isTutorial = isTextTutorialCourse(course)
    const title = (course.title || "").toLowerCase()
    const slug = (course.slug || "").toLowerCase()
    const tech = (course.technology || "").toLowerCase()
    const desc = (course.description || "").toLowerCase()
    const full = `${title} ${slug} ${tech} ${desc}`

    // ── UPSC ──────────────────────────────────────────────────────────────────
    if (
        (tech.includes("upsc") || title.includes("upsc") || slug.includes("upsc")) &&
        !full.includes("bpsc") &&
        !full.includes("bihar")
    ) {
        return {
            goalId: "upsc",
            category: "Civil Services",
            subject: "General Studies & Civil Services",
            tags: ["upsc", "civil-services", "general-studies"],
            isTutorial,
        }
    }

    // ── BPSC ──────────────────────────────────────────────────────────────────
    if (
        tech.includes("bpsc") ||
        title.includes("bpsc") ||
        slug.includes("bpsc") ||
        full.includes("bihar")
    ) {
        return {
            goalId: "bpsc",
            category: "Civil Services",
            subject: "General Studies & Bihar GK",
            tags: ["bpsc", "state-psc", "bihar-gk", "civil-services"],
            isTutorial,
        }
    }

    // ── SCHOOL & BOARDS (Class 6th - 12th) ──────────────────────────────────
    for (let c = 12; c >= 6; c--) {
        const numStr = c.toString()
        if (
            tech.includes(`class ${numStr}`) ||
            tech.includes(`class ${numStr}th`) ||
            title.includes(`class ${numStr}`) ||
            slug.includes(`class-${numStr}`) ||
            slug.includes(`class${numStr}`)
        ) {
            return {
                goalId: `class-${numStr}`,
                category: "School & Boards",
                subject: `Class ${numStr}th Curriculum`,
                tags: ["school-prep", `class-${numStr}`, "cbse"],
                isTutorial,
            }
        }
    }

    // ── GOVT. EXAMS (SSC, BANKING, RAILWAYS) ─────────────────────────────────
    if (
        /\b(ssc|cgl|rrb|ibps)\b/i.test(full) ||
        full.includes("banking") ||
        full.includes("railway")
    ) {
        return {
            goalId: "govt-exams",
            category: "Govt. Job Exams",
            subject: "Government Job Examinations",
            tags: ["govt-exams", "ssc", "banking", "railway"],
            isTutorial,
        }
    }

    // ── DATA SCIENCE & AI ───────────────────────────────────────────────────
    if (
        full.includes("data science") ||
        full.includes("machine learning") ||
        full.includes("deep learning") ||
        full.includes("gen ai") ||
        full.includes("generative ai") ||
        full.includes("genai") ||
        full.includes("neural network") ||
        full.includes("llm") ||
        (tech.includes("ai") && !full.includes("upsc") && !full.includes("bpsc"))
    ) {
        return {
            goalId: "data-science",
            category: "Tech & Coding",
            subject: "Data Science & AI",
            tags: ["skills", "data-science", "ai", "machine-learning"],
            isTutorial,
        }
    }

    // ── DSA & CODING INTERVIEWS ─────────────────────────────────────────────
    if (
        full.includes("dsa") ||
        full.includes("leetcode") ||
        full.includes("coding interview") ||
        full.includes("algorithms") ||
        full.includes("data structure") ||
        full.includes("system design")
    ) {
        return {
            goalId: "dsa-interview",
            category: "Tech & Coding",
            subject: "DSA & Coding Interviews",
            tags: ["skills", "coding", "dsa", "interview", "algorithms"],
            isTutorial,
        }
    }

    // ── GENERAL SKILLS & TECH ───────────────────────────────────────────────
    return {
        goalId: "skills",
        category: "Tech & Coding",
        subject: "Programming & Tech Skills",
        tags: ["skills", "coding", "tech", "web-development"],
        isTutorial,
    }
}

/**
 * Strict boundary check to determine if a course legitimately belongs to the active goal.
 * Strictly prohibits non-tech courses (UPSC/BPSC/School) from leaking into tech goals,
 * and tech courses from leaking into Civil Services/School goals.
 */
export function isCourseMatchingGoal(
    course: RawCourseLike & { goalId?: string; tags?: string[]; category?: string },
    activeGoalId: string,
    activeGoalTags: string[] = []
): boolean {
    const gid = (activeGoalId || "").toLowerCase().trim()
    const cGoal = (course.goalId || "").toLowerCase().trim()
    const cTags = (course.tags || []).map((t) => t.toLowerCase())
    const title = (course.title || "").toLowerCase()
    const slug = (course.slug || "").toLowerCase()
    const desc = (course.description || "").toLowerCase()
    const tech = (course.technology || "").toLowerCase()
    const full = `${title} ${slug} ${desc} ${tech}`

    // 1. Exact goalId match
    if (cGoal && cGoal === gid) {
        return true
    }

    // 2. Strict Domain Isolation
    const isCivilServices = cGoal === "upsc" || cGoal === "bpsc" || full.includes("upsc") || full.includes("bpsc") || full.includes("bihar")
    const isSchool = cGoal.startsWith("class-") || full.includes("class 6") || full.includes("class 7") || full.includes("class 8") || full.includes("class 9") || full.includes("class 10")
    const isGovt = cGoal === "govt-exams" || cGoal === "ssc" || full.includes("ssc") || full.includes("banking") || full.includes("railway")

    // ── BPSC ──
    if (gid === "bpsc") {
        if (cGoal === "bpsc" || cTags.includes("bpsc") || full.includes("bpsc") || full.includes("bihar")) {
            return true
        }
        return false
    }

    // ── UPSC ──
    if (gid === "upsc") {
        if (full.includes("bpsc") || full.includes("bihar")) return false
        if (cGoal === "upsc" || cTags.includes("upsc") || full.includes("upsc")) {
            return true
        }
        return false
    }

    // ── School Classes ──
    if (gid.startsWith("class-")) {
        const clsNum = gid.replace("class-", "")
        if (
            cGoal === gid ||
            cTags.includes(gid) ||
            full.includes(`class ${clsNum}`) ||
            full.includes(`${clsNum}th`) ||
            slug.includes(`class-${clsNum}`) ||
            slug.includes(`class${clsNum}`)
        ) {
            return true
        }
        return false
    }

    // ── Govt Exams ──
    if (gid === "govt-exams" || gid === "ssc") {
        if (
            cGoal === "govt-exams" ||
            cGoal === "ssc" ||
            cTags.includes("ssc") ||
            cTags.includes("govt-exams") ||
            /\b(ssc|cgl|rrb|ibps)\b/i.test(full) ||
            full.includes("banking") ||
            full.includes("railway")
        ) {
            return true
        }
        return false
    }

    // ── Tech Goals must NEVER show Civil Services, School, or Govt Exams ──
    if (gid === "skills" || gid === "data-science" || gid === "dsa-interview") {
        if (isCivilServices || isSchool || isGovt) {
            return false
        }

        // Data Science & AI specific goal
        if (gid === "data-science") {
            return (
                cGoal === "data-science" ||
                cTags.includes("data-science") ||
                cTags.includes("machine-learning") ||
                title.includes("data science") ||
                title.includes("machine learning") ||
                title.includes("deep learning") ||
                title.includes("genai") ||
                title.includes("generative ai") ||
                tech.includes("data science") ||
                tech.includes("deep learning") ||
                tech.includes("gen ai")
            )
        }

        // DSA & Coding Interview specific goal
        if (gid === "dsa-interview") {
            return (
                cGoal === "dsa-interview" ||
                cTags.includes("dsa") ||
                cTags.includes("dsa-interview") ||
                cTags.includes("leetcode") ||
                title.includes("dsa") ||
                title.includes("algorithm") ||
                title.includes("leetcode") ||
                title.includes("coding interview") ||
                title.includes("blind 75") ||
                slug.includes("dsa") ||
                slug.includes("leetcode")
            )
        }

        // Skills & Tech broad track (Web, Python, AI, Software Engineering)
        if (gid === "skills") {
            return (
                cGoal === "skills" ||
                cGoal === "data-science" ||
                cGoal === "dsa-interview" ||
                cTags.includes("skills") ||
                cTags.includes("coding") ||
                cTags.includes("tech") ||
                full.includes("python") ||
                full.includes("web") ||
                full.includes("next.js") ||
                full.includes("fullstack") ||
                full.includes("programming")
            )
        }
    }

    // Fallback: check matching tags
    if (activeGoalTags.length > 0) {
        return activeGoalTags.some(
            (tag) => cTags.includes(tag.toLowerCase()) || full.includes(tag.toLowerCase())
        )
    }

    return false
}
