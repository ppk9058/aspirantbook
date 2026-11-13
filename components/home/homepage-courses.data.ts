// ─── COURSE SLUG MAP ──────────────────────────────────────────────────────────
// Single source of truth linking homepage flash cards to real DB courses.
// ─────────────────────────────────────────────────────────────────────────────
export const COURSE_SLUG_MAP: Record<string, string> = {
    // ✅ UPSC — real video courses in DB
    "upsc-prelims-mains-batch":  "upsc-prelims-mains-comprehensive-batch",
    "upsc-gs-primer":            "upsc-gs-foundation-primer",

    // ✅ BPSC — real video courses in DB
    "bpsc-prelims-current-affairs": "72nd-bpsc-prelims-current-affairs",

    // ✅ Class 6 — real video courses in DB
    "class-6-mastery":           "class-6-complete-mastery-batch",
    "class-6-starter":           "class-6-foundation-starter",

    // ✅ Class 7 — real video courses in DB
    "class-7-excellence":        "class-7-academic-excellence-batch",
    "class-7-booster":           "class-7-concept-booster",

    // ✅ Class 8 — real video courses in DB
    "class-8-olympiad":          "class-8-olympiad-board-foundation-batch",
    "class-8-essentials":        "class-8-pre-foundation-essentials",

    // ✅ Class 9 — real video courses in DB
    "class-9-target-95":         "class-9-target-95-foundation-batch",
    "class-9-bridge":            "class-9-cbse-bridge-course",

    // ✅ Class 10 — real video courses in DB
    "class-10-toppers":          "class-10-board-toppers-comprehensive-batch",
    "class-10-revision":         "class-10-board-revision-sprint",
}

export interface BatchCourse {
    id: string
    title: string
    classTag: string
    language: string
    targetText: string
    scheduleText: string
    price: string
    originalPrice?: string
    discount?: string
    image: string
    buttonText: string
    buttonLink: string     // /courses/[slug] for live, /courses for coming-soon
    slug?: string          // DB course slug — required when isLive = true
    isLive?: boolean       // true = real DB course exists & linked
    isPrimaryAction?: boolean
}

export const CLASS_TABS = [
    { id: "all",      label: "All" },
    { id: "upsc",     label: "UPSC" },
    { id: "bpsc",     label: "BPSC" },
    { id: "class-6",  label: "Class 6" },
    { id: "class-7",  label: "Class 7" },
    { id: "class-8",  label: "Class 8" },
    { id: "class-9",  label: "Class 9" },
    { id: "class-10", label: "Class 10" },
]

export const COURSES_DATA: Record<string, { sectionTitle: string; batches: BatchCourse[] }> = {
    // ─── UPSC ─────────────────────────────────────────────────────────────────
    "upsc": {
        sectionTitle: "UPSC Civil Services — Video Courses",
        batches: [
            {
                id: "upsc-prelims-mains-batch",
                slug: "upsc-prelims-mains-comprehensive-batch",
                isLive: true,
                title: "UPSC Prelims & Mains Comprehensive Video Batch",
                classTag: "UPSC",
                language: "HINGLISH",
                targetText: "Complete GS Papers 1 to 4 + CSAT with trend breakdown",
                scheduleText: "Self-Paced | 2 Full Video Lectures | Watch Now",
                price: "₹4,999",
                originalPrice: "₹9,999",
                discount: "50% OFF",
                image: "/batch-amber.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/upsc-prelims-mains-comprehensive-batch",
                isPrimaryAction: true,
            },
            {
                id: "upsc-gs-primer",
                slug: "upsc-gs-foundation-primer",
                isLive: true,
                title: "UPSC GS Foundation & Current Affairs Primer",
                classTag: "UPSC",
                language: "HINGLISH",
                targetText: "Polity, History, Geography foundations & trend analysis",
                scheduleText: "Self-Paced | 2 Full Video Lectures | 100% Free",
                price: "Free",
                originalPrice: "₹1,999",
                image: "/batch-blue.svg",
                buttonText: "Watch Free",
                buttonLink: "/courses/upsc-gs-foundation-primer",
            },
        ],
    },

    // ─── BPSC ─────────────────────────────────────────────────────────────────
    "bpsc": {
        sectionTitle: "BPSC — Video Courses",
        batches: [
            {
                id: "bpsc-prelims-current-affairs",
                slug: "72nd-bpsc-prelims-current-affairs",
                isLive: true,
                title: "72nd BPSC — Prelims Current Affairs & Bihar Special",
                classTag: "BPSC",
                language: "HINGLISH",
                targetText: "72nd BPSC Prelims — Current Affairs, Bihar GK, Polity & Economy",
                scheduleText: "Self-Paced | 13 Video Lectures | Start Watching Now",
                price: "₹999",
                originalPrice: "₹1,999",
                discount: "50% OFF",
                image: "/course-bpsc.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/72nd-bpsc-prelims-current-affairs",
                isPrimaryAction: true,
            },
        ],
    },

    // ─── Class 6th ────────────────────────────────────────────────────────────
    "class-6": {
        sectionTitle: "Class 6 School Preparation Courses",
        batches: [
            {
                id: "class-6-mastery",
                slug: "class-6-complete-mastery-batch",
                isLive: true,
                title: "Class 6 Complete Mastery Batch (CBSE/ICSE)",
                classTag: "Class 6",
                language: "HINGLISH",
                targetText: "Mathematics, General Science, and English Grammar",
                scheduleText: "Self-Paced | 2 Full Video Lectures | Start Watching",
                price: "₹2,499",
                originalPrice: "₹3,999",
                discount: "37% OFF",
                image: "/batch-green.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/class-6-complete-mastery-batch",
                isPrimaryAction: true,
            },
            {
                id: "class-6-starter",
                slug: "class-6-foundation-starter",
                isLive: true,
                title: "Class 6 Foundation — Math & Science Starter",
                classTag: "Class 6",
                language: "HINGLISH",
                targetText: "Core fundamentals of Science & Math for middle schoolers",
                scheduleText: "Self-Paced | 2 Full Video Lectures | 100% Free",
                price: "Free",
                originalPrice: "₹999",
                image: "/batch-purple.svg",
                buttonText: "Watch Free",
                buttonLink: "/courses/class-6-foundation-starter",
            },
        ],
    },

    // ─── Class 7th ────────────────────────────────────────────────────────────
    "class-7": {
        sectionTitle: "Class 7 School Preparation Courses",
        batches: [
            {
                id: "class-7-excellence",
                slug: "class-7-academic-excellence-batch",
                isLive: true,
                title: "Class 7 Academic Excellence Batch",
                classTag: "Class 7",
                language: "HINGLISH",
                targetText: "Fractions, Heat, Motion, and Algebraic Expressions",
                scheduleText: "Self-Paced | 2 Full Video Lectures | Start Watching",
                price: "₹2,499",
                originalPrice: "₹3,999",
                discount: "37% OFF",
                image: "/batch-blue.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/class-7-academic-excellence-batch",
                isPrimaryAction: true,
            },
            {
                id: "class-7-booster",
                slug: "class-7-concept-booster",
                isLive: true,
                title: "Class 7 Science & Math Concept Booster",
                classTag: "Class 7",
                language: "HINGLISH",
                targetText: "Plant Nutrition, Photosynthesis & Integer Arithmetic",
                scheduleText: "Self-Paced | 2 Full Video Lectures | 100% Free",
                price: "Free",
                originalPrice: "₹999",
                image: "/batch-purple.svg",
                buttonText: "Watch Free",
                buttonLink: "/courses/class-7-concept-booster",
            },
        ],
    },

    // ─── Class 8th ────────────────────────────────────────────────────────────
    "class-8": {
        sectionTitle: "Class 8 Foundation & Olympiad Batches",
        batches: [
            {
                id: "class-8-olympiad",
                slug: "class-8-olympiad-board-foundation-batch",
                isLive: true,
                title: "Class 8 Olympiad & Board Foundation Batch",
                classTag: "Class 8",
                language: "HINGLISH",
                targetText: "Linear Equations, Force & Pressure, and Cellular Biology",
                scheduleText: "Self-Paced | 2 Full Video Lectures | Start Watching",
                price: "₹2,999",
                originalPrice: "₹4,499",
                discount: "33% OFF",
                image: "/batch-amber.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/class-8-olympiad-board-foundation-batch",
                isPrimaryAction: true,
            },
            {
                id: "class-8-essentials",
                slug: "class-8-pre-foundation-essentials",
                isLive: true,
                title: "Class 8 Pre-Foundation & Olympiad Essentials",
                classTag: "Class 8",
                language: "HINGLISH",
                targetText: "Crop Management, Rational Numbers & Proof Methods",
                scheduleText: "Self-Paced | 2 Full Video Lectures | 100% Free",
                price: "Free",
                originalPrice: "₹1,299",
                image: "/batch-emerald.svg",
                buttonText: "Watch Free",
                buttonLink: "/courses/class-8-pre-foundation-essentials",
            },
        ],
    },

    // ─── Class 9th ────────────────────────────────────────────────────────────
    "class-9": {
        sectionTitle: "Class 9 Board Foundation & NTSE Courses",
        batches: [
            {
                id: "class-9-target-95",
                slug: "class-9-target-95-foundation-batch",
                isLive: true,
                title: "Class 9 Target 95%+ Board Foundation Batch",
                classTag: "Class 9",
                language: "HINGLISH",
                targetText: "Laws of Motion, Polynomials, and Real Number Systems",
                scheduleText: "Self-Paced | 2 Full Video Lectures | Start Watching",
                price: "₹3,499",
                originalPrice: "₹5,499",
                discount: "36% OFF",
                image: "/batch-blue.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/class-9-target-95-foundation-batch",
                isPrimaryAction: true,
            },
            {
                id: "class-9-bridge",
                slug: "class-9-cbse-bridge-course",
                isLive: true,
                title: "Class 9 CBSE Science & Math Bridge Course",
                classTag: "Class 9",
                language: "HINGLISH",
                targetText: "Kinematics, Velocity, Speed & Graphical Coordinate Analysis",
                scheduleText: "Self-Paced | 2 Full Video Lectures | 100% Free",
                price: "Free",
                originalPrice: "₹1,499",
                image: "/batch-purple.svg",
                buttonText: "Watch Free",
                buttonLink: "/courses/class-9-cbse-bridge-course",
            },
        ],
    },

    // ─── Class 10th ───────────────────────────────────────────────────────────
    "class-10": {
        sectionTitle: "Class 10 Board Excellence & Fast-Track Batches",
        batches: [
            {
                id: "class-10-toppers",
                slug: "class-10-board-toppers-comprehensive-batch",
                isLive: true,
                title: "Class 10 Board Toppers Comprehensive Batch",
                classTag: "Class 10",
                language: "HINGLISH",
                targetText: "Electricity Numericals, Quadratic Equations & Board Exemplars",
                scheduleText: "Self-Paced | 2 Full Video Lectures | Start Watching",
                price: "₹3,999",
                originalPrice: "₹5,999",
                discount: "33% OFF",
                image: "/batch-rose.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/class-10-board-toppers-comprehensive-batch",
                isPrimaryAction: true,
            },
            {
                id: "class-10-revision",
                slug: "class-10-board-revision-sprint",
                isLive: true,
                title: "Class 10 Board Exam Quick Revision Sprint",
                classTag: "Class 10",
                language: "HINGLISH",
                targetText: "Chemical Reactions, Real Numbers & Formula Quick Sheets",
                scheduleText: "Self-Paced | 2 Full Video Lectures | 100% Free",
                price: "Free",
                originalPrice: "₹1,999",
                image: "/batch-emerald.svg",
                buttonText: "Watch Free",
                buttonLink: "/courses/class-10-board-revision-sprint",
            },
        ],
    },
}

export function findBatchBySlugOrId(identifier: string): BatchCourse | null {
    for (const section of Object.values(COURSES_DATA)) {
        for (const b of section.batches) {
            if (b.slug === identifier || b.id === identifier || COURSE_SLUG_MAP[b.id] === identifier) {
                return b
            }
        }
    }
    return null
}
