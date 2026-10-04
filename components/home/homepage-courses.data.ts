// ─── COURSE SLUG MAP ──────────────────────────────────────────────────────────
// Single source of truth linking homepage flash cards to real DB courses.
// ─────────────────────────────────────────────────────────────────────────────
export const COURSE_SLUG_MAP: Record<string, string> = {
    // ✅ UPSC — real video courses in DB
    "upsc-prelims-mains-batch":  "upsc-prelims-mains-comprehensive-batch",
    "upsc-gs-primer":            "upsc-gs-foundation-primer",

    // ✅ BPSC — real video courses in DB
    "bpsc-prelims-current-affairs": "72nd-bpsc-prelims-current-affairs",
    "bpsc-video-2":                 "bpsc-2nd-video-tutorial",

    // ✅ Class 6 — real video courses in DB
    "class-6-mastery":           "class-6-complete-mastery-batch",
    "class-6-starter":           "class-6-foundation-starter",
    "half-yearly-678":           "half-yearly-6",
    "half-yearly-78":            "half-yearly-6",
    "half-yearly-6":             "half-yearly-6",

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

    // ✅ Upcoming & Specialized Batches (Course Detail Landing Pages)
    "upsc-csat":                 "upsc-csat-paper-2-complete-video",
    "bpsc-mains-essay":          "bpsc-mains-essay-gs-paper-video-batch",
    "foundation-8":              "pre-jee-neet-foundation-class-8",
    "early-jee-9":               "ignite-early-jee-neet-path-class-9",
    "topper-10":                 "super-50-board-toppers-test-series",
    "python-ai-junior":          "ai-python-for-young-innovators",
    "web-dev-kids":              "full-stack-web-dev-for-students",
    "data-analytics-junior":     "data-science-and-visual-thinking",
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
    { id: "skills",   label: "Skills" },
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
            {
                id: "upsc-csat",
                slug: "upsc-csat-paper-2-complete-video",
                title: "UPSC CSAT Paper 2 — Complete Video Series",
                classTag: "UPSC",
                language: "HINGLISH",
                targetText: "Comprehension, Data Interpretation, Reasoning & Math",
                scheduleText: "Launching soon — Register for early access",
                price: "Coming Soon",
                image: "/batch-purple.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/upsc-csat-paper-2-complete-video",
                isLive: false,
            },
        ],
    },

    // ─── BPSC ─────────────────────────────────────────────────────────────────
    "bpsc": {
        sectionTitle: "BPSC — Video Courses (Live in DB ✅)",
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
            {
                id: "bpsc-video-2",
                slug: "bpsc-2nd-video-tutorial",
                isLive: true,
                title: "BPSC Video Series — Part 2",
                classTag: "BPSC",
                language: "HINGLISH",
                targetText: "BPSC Prelims targeted video lectures — Part 2",
                scheduleText: "Self-Paced | 3 Video Lectures | Start Watching Now",
                price: "Free",
                image: "/batch-blue.svg",
                buttonText: "Watch Now",
                buttonLink: "/courses/bpsc-2nd-video-tutorial",
            },
            {
                id: "bpsc-mains-essay",
                slug: "bpsc-mains-essay-gs-paper-video-batch",
                title: "BPSC Mains — Essay & GS Paper Video Batch",
                classTag: "BPSC",
                language: "HINGLISH",
                targetText: "Mains GS 1, 2, 3 + Essay writing framework with model answers",
                scheduleText: "Launching soon",
                price: "Coming Soon",
                image: "/batch-emerald.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/bpsc-mains-essay-gs-paper-video-batch",
                isLive: false,
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
            {
                id: "half-yearly-6",
                slug: "half-yearly-6",
                isLive: true,
                title: "Half Yearly Marathon (Class 6th, 7th & 8th ICSE)",
                classTag: "Class 6, 7 , 8",
                language: "HINGLISH",
                targetText: "School Preparation",
                scheduleText: "Starts on 7 Sep, 2026 Ends on 1 Apr, 2027",
                price: "Free",
                originalPrice: "₹1,500",
                image: "/batch-emerald.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/half-yearly-6",
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
            {
                id: "half-yearly-78",
                slug: "half-yearly-6",
                isLive: true,
                title: "Half Yearly Marathon (Class 6th ,7th & 8th)",
                classTag: "Class 6, 7 , 8",
                language: "HINGLISH",
                targetText: "School Preparation",
                scheduleText: "Starts on 7 Sep, 2026 Ends on 1 Apr, 2027",
                price: "Free",
                originalPrice: "₹1,500",
                image: "/batch-emerald.svg",
                buttonText: "Enroll Now",
                buttonLink: "/courses/half-yearly-6",
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
            {
                id: "foundation-8",
                slug: "pre-jee-neet-foundation-class-8",
                title: "Pre-JEE / NEET Foundation Class 8",
                classTag: "Class 8",
                language: "HINGLISH",
                targetText: "Conceptual Depth in Physics, Chem & Math",
                scheduleText: "Starts on 10 Aug, 2026 Ends on 1 Apr, 2027",
                price: "Coming Soon",
                image: "/batch-green.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/pre-jee-neet-foundation-class-8",
                isLive: false,
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
            {
                id: "early-jee-9",
                slug: "ignite-early-jee-neet-path-class-9",
                title: "Ignite Early JEE/NEET Path Class 9",
                classTag: "Class 9",
                language: "HINGLISH",
                targetText: "Advanced High-School Analytical Thinking",
                scheduleText: "Starts on 1 Aug, 2026 Ends on 1 Apr, 2027",
                price: "Coming Soon",
                image: "/batch-rose.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/ignite-early-jee-neet-path-class-9",
                isLive: false,
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
            {
                id: "topper-10",
                slug: "super-50-board-toppers-test-series",
                title: "Super 50 Board Toppers Test Series",
                classTag: "Class 10",
                language: "ENGLISH",
                targetText: "Live Evaluated Subjective Mock Tests",
                scheduleText: "Starts on 15 Nov, 2026 Ends on 20 Mar, 2027",
                price: "Coming Soon",
                image: "/batch-purple.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/super-50-board-toppers-test-series",
                isLive: false,
            },
        ],
    },

    // ─── SKILLS ───────────────────────────────────────────────────────────────
    "skills": {
        sectionTitle: "Future Skills, AI & Programming Curricula",
        batches: [
            {
                id: "actual-video-course-1",
                slug: "actual",
                isLive: true,
                title: "Actual Video course1",
                classTag: "Skills",
                language: "HINGLISH",
                targetText: "Comprehensive video course with chapter-wise syllabus, live video lectures, and PDF study notes.",
                scheduleText: "Self-Paced | 1 Lesson | Video Course",
                price: "₹999",
                originalPrice: "₹1,599",
                discount: "38% OFF",
                image: "/uploads/courses/thumbnails/1790613663071-b3.png",
                buttonText: "Enroll Now",
                buttonLink: "/courses/actual",
                isPrimaryAction: true,
            },
            {
                id: "python-ai-junior",
                slug: "ai-python-for-young-innovators",
                title: "AI & Python for Young Innovators",
                classTag: "Skills",
                language: "HINGLISH",
                targetText: "Build Real AI Agents, Games & Automation",
                scheduleText: "Self-Paced with 24x7 Live AI Mentor Support",
                price: "Coming Soon",
                image: "/batch-skills.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/ai-python-for-young-innovators",
                isLive: false,
            },
            {
                id: "web-dev-kids",
                slug: "full-stack-web-dev-for-students",
                title: "Full-Stack Web Dev for Students",
                classTag: "Skills",
                language: "ENGLISH",
                targetText: "HTML, CSS, JavaScript & Next.js Basics",
                scheduleText: "Project-Led Interactive Labs & Sandbox",
                price: "Coming Soon",
                image: "/batch-emerald.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/full-stack-web-dev-for-students",
                isLive: false,
            },
            {
                id: "data-analytics-junior",
                slug: "data-science-and-visual-thinking",
                title: "Data Science & Visual Thinking",
                classTag: "Skills",
                language: "HINGLISH",
                targetText: "Analyze Real-World Datasets with Python & SQL",
                scheduleText: "Zero to Certificate in 30 Days",
                price: "Coming Soon",
                image: "/batch-blue.svg",
                buttonText: "Coming Soon",
                buttonLink: "/courses/data-science-and-visual-thinking",
                isLive: false,
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

