export interface TestSeriesItem {
    id: string
    title: string
    category: string
    examType: "Civil Services" | "SSC" | "Banking" | "Railways" | "State" | "Teaching" | "Engineering" | "Other"
    logoType: "ssc" | "sbi" | "rrb" | "upsssc" | "ibps" | "upsc" | "bpsc" | "uppcs" | "ncert" | "ugc" | "gate" | "general"
    users: string
    totalTests: number
    freeTests: number
    languages: string
    highlights: string[]
    moreTestsCount: number
    description?: string
    duration?: string
    questions?: number
    goalId?: string
    tags?: string[]
}

export interface DefaultTestItem {
    id: string
    title: string
    questions: number
    marks: number
    durationMinutes: number
    languages: string
    isFree: boolean
    attempts?: number
}

export interface DefaultTestSection {
    id: string
    title: string
    hindiTitle?: string
    count: number
    tests: DefaultTestItem[]
}

export const TEST_SERIES_DATA: TestSeriesItem[] = [
    {
        id: "bpsc-72nd-2026",
        title: "72nd BPSC CCE (Preliminary) Mock Test Series 2026",
        category: "BPSC",
        examType: "Civil Services",
        logoType: "bpsc",
        users: "118.6k",
        totalTests: 283,
        freeTests: 2,
        languages: "English, Hindi",
        highlights: [
            "10 Full Tests (Latest Pattern)",
            "131 Chapter Tests (Latest Pattern)",
            "26 Blissful Bihar (आनंदमय बिहार)"
        ],
        moreTestsCount: 116,
        description: "Strictly aligned with latest 4-options negative marking BPSC pattern with in-depth Bihar Special History, Geography, and Economy.",
        duration: "120 mins",
        questions: 150,
        goalId: "bpsc",
        tags: ["bpsc", "state-psc", "bihar-gk"]
    },
    {
        id: "bpsc-bihar-special-2026",
        title: "BPSC Bihar Special (बिहार विशेष) Dedicated Test Series 2026",
        category: "BPSC",
        examType: "Civil Services",
        logoType: "bpsc",
        users: "64.2k",
        totalTests: 65,
        freeTests: 3,
        languages: "English, Hindi",
        highlights: [
            "15 Bihar History & Freedom Struggle",
            "18 Bihar Geography, River Systems & Minerals",
            "20 Bihar Budget, Economic Survey & Census"
        ],
        moreTestsCount: 12,
        description: "Comprehensive sectional tests exclusively for Bihar specific general knowledge scoring 30+ marks in BPSC Prelims.",
        duration: "60 mins",
        questions: 50,
        goalId: "bpsc",
        tags: ["bpsc", "bihar-gk"]
    },
    {
        id: "bpsc-mains-gs-2026",
        title: "BPSC 71st/72nd Mains GS Paper 1 & 2 Answer Writing Mock Series",
        category: "BPSC",
        examType: "Civil Services",
        logoType: "bpsc",
        users: "42.1k",
        totalTests: 45,
        freeTests: 1,
        languages: "English, Hindi",
        highlights: [
            "12 Sectional GS Paper 1 Tests (Statistics & History)",
            "15 Sectional GS Paper 2 Tests (Polity, Eco, S&T)",
            "8 Full-Length Mains Simulated Mocks"
        ],
        moreTestsCount: 10,
        description: "Detailed model answer evaluations for BPSC Mains with strict adherence to 38-mark and 8-mark question formats.",
        duration: "180 mins",
        questions: 8,
        goalId: "bpsc",
        tags: ["bpsc", "mains", "answer-writing"]
    },
    {
        id: "bpsc-tre-2026",
        title: "BPSC TRE 4.0 Teacher Recruitment Exam Mock Test Series 2026",
        category: "BPSC TRE",
        examType: "Teaching",
        logoType: "bpsc",
        users: "182.4k",
        totalTests: 210,
        freeTests: 5,
        languages: "English, Hindi",
        highlights: [
            "30 Full Tests (General Studies & Language)",
            "90 Subject Specific Tests (Class 1-5, 6-8, 9-10)",
            "NCERT & SCERT Pedagogy Focus"
        ],
        moreTestsCount: 90,
        description: "Comprehensive mock test series for BPSC Shikshak Bharti (TRE 4.0) for Primary (1-5), Middle (6-8), Secondary (9-10), and Senior Secondary (11-12).",
        duration: "150 mins",
        questions: 150,
        goalId: "bpsc",
        tags: ["bpsc", "bpsc-tre", "teaching"]
    },
    {
        id: "upsc-prelims-2026",
        title: "UPSC Civil Services Exam (Prelims) 2026 Mock Test Series",
        category: "UPSC",
        examType: "Civil Services",
        logoType: "upsc",
        users: "248.5k",
        totalTests: 320,
        freeTests: 3,
        languages: "English, Hindi",
        highlights: [
            "35 Full Length GS Paper I Simulated Tests",
            "15 Full Length CSAT Paper II Tests",
            "20 Years UPSC PYQs with Explanations",
            "Weekly All-India Live Ranking",
            "In-depth Negative Marking Analytics"
        ],
        moreTestsCount: 250,
        description: "All-India ranking mock tests strictly following UPSC question framing, tricky elimination options, and CSAT aptitude standards.",
        duration: "120 mins",
        questions: 100,
        goalId: "upsc",
        tags: ["upsc", "civil-services", "ias"]
    },
    {
        id: "upsc-prelims-2027",
        title: "UPSC Civil Services Exam (Prelims) 2027 Mock Test Series",
        category: "UPSC",
        examType: "Civil Services",
        logoType: "upsc",
        users: "76.4k",
        totalTests: 180,
        freeTests: 2,
        languages: "English, Hindi",
        highlights: [
            "45 NCERT Foundation Chapter Mocks",
            "25 Standard Reference Book Chapter Tests",
            "10 Full Length GS Simulated Tests"
        ],
        moreTestsCount: 100,
        description: "Early concept building and NCERT/Standard Reference book mocks for UPSC Civil Services Examination 2027 aspirants.",
        duration: "120 mins",
        questions: 100,
        goalId: "upsc",
        tags: ["upsc", "civil-services"]
    },
    {
        id: "upsc-epfo-apfc-2026",
        title: "UPSC EPFO (APFC) Mock Test Series 2026",
        category: "UPSC",
        examType: "Civil Services",
        logoType: "upsc",
        users: "58.1k",
        totalTests: 95,
        freeTests: 2,
        languages: "English, Hindi",
        highlights: [
            "20 Industrial Relations & Labour Laws Tests",
            "18 Social Security in India Tests",
            "15 Full Length Recruitment Test Mocks"
        ],
        moreTestsCount: 42,
        description: "Comprehensive test series covering specialized UPSC EPFO syllabus including General Accounting Principles and Labour Regulations.",
        duration: "120 mins",
        questions: 120,
        goalId: "upsc",
        tags: ["upsc", "epfo"]
    },
    {
        id: "class-10-boards-2026",
        title: "CBSE & State Board Class 10th Super 50 Board Exam Mock Test Series 2026",
        category: "Class 10",
        examType: "State",
        logoType: "ncert",
        users: "142.5k",
        totalTests: 180,
        freeTests: 4,
        languages: "English, Hindi",
        highlights: [
            "25 Full Length Mock Papers (CBSE Pattern)",
            "80 Chapter Tests (Science & Maths)",
            "NCERT Exemplar Solutions"
        ],
        moreTestsCount: 75,
        description: "Full CBSE & State Board syllabus coverage for Class 10th with step-by-step marking schemes and video explanations.",
        duration: "180 mins",
        questions: 38,
        goalId: "class-10",
        tags: ["class-10", "school-prep", "cbse"]
    },
    {
        id: "class-9-annual-2026",
        title: "Class 9th Annual Exam & Junior NTSE Mock Test Series 2026",
        category: "Class 9",
        examType: "State",
        logoType: "ncert",
        users: "48.2k",
        totalTests: 95,
        freeTests: 3,
        languages: "English, Hindi",
        highlights: [
            "15 Full Syllabus Tests",
            "50 Chapter Practice Tests",
            "Mental Ability Drills"
        ],
        moreTestsCount: 30,
        description: "Comprehensive NCERT syllabus tests for Class 9th students aiming for school rank 1 and junior Olympiad medals.",
        duration: "120 mins",
        questions: 40,
        goalId: "class-9",
        tags: ["class-9", "school-prep"]
    },
    {
        id: "class-8-annual-2026",
        title: "Class 8th Foundation & NMMS Scholarship Mock Test Series 2026",
        category: "Class 8",
        examType: "State",
        logoType: "ncert",
        users: "36.8k",
        totalTests: 80,
        freeTests: 3,
        languages: "English, Hindi",
        highlights: [
            "20 Science & Maths Chapter Practice Tests",
            "15 Full Length Mock Tests (Latest Pattern)",
            "NMMS / Olympiad Level Reasoning Questions"
        ],
        moreTestsCount: 25,
        description: "Comprehensive NCERT syllabus tests for Class 8th students covering Mathematics, Science, Social Science, and Mental Ability.",
        duration: "90 mins",
        questions: 50,
        goalId: "class-8",
        tags: ["class-8", "school-prep", "foundation"]
    },
    {
        id: "class-7-foundation-2026",
        title: "Class 7th Comprehensive School Prep & Olympiad Mock Test Series 2026",
        category: "Class 7",
        examType: "State",
        logoType: "ncert",
        users: "28.5k",
        totalTests: 70,
        freeTests: 3,
        languages: "English, Hindi",
        highlights: [
            "18 Science, Maths & English Chapter Tests",
            "12 School Term & Annual Mock Exams",
            "Conceptual Step-by-Step Solutions"
        ],
        moreTestsCount: 20,
        description: "Targeted NCERT practice questions for Class 7th students to build solid mathematical and scientific foundation.",
        duration: "90 mins",
        questions: 40,
        goalId: "class-7",
        tags: ["class-7", "school-prep", "foundation"]
    },
    {
        id: "class-6-foundation-2026",
        title: "Class 6th Middle School Foundation & Navodaya Mock Test Series 2026",
        category: "Class 6",
        examType: "State",
        logoType: "ncert",
        users: "31.2k",
        totalTests: 65,
        freeTests: 3,
        languages: "English, Hindi",
        highlights: [
            "15 Foundational Chapter Tests",
            "10 Full School Exam Mocks",
            "JNVST & Sainik School Foundation Drills"
        ],
        moreTestsCount: 18,
        description: "Fun, engaging, and rigorous NCERT practice tests for Class 6th students stepping into middle school academics.",
        duration: "60 mins",
        questions: 35,
        goalId: "class-6",
        tags: ["class-6", "school-prep", "foundation"]
    },
    {
        id: "skills-dsa-faang-2026",
        title: "Software Engineering & DSA Coding Assessment Series 2026",
        category: "Skill",
        examType: "Engineering",
        logoType: "general",
        users: "68.4k",
        totalTests: 120,
        freeTests: 5,
        languages: "Python, C++, Java, JS",
        highlights: [
            "20 Company Mock Assessments (Google, Amazon)",
            "60 Topic Wise DSA Problem Sets",
            "Real-Time Test Cases Evaluator"
        ],
        moreTestsCount: 40,
        description: "Simulates actual 60-90 minute online coding rounds (OA) with automated test case evaluation and memory benchmarks.",
        duration: "90 mins",
        questions: 4,
        goalId: "skills",
        tags: ["skills", "coding", "dsa"]
    },
    {
        id: "skills-python-ai-2026",
        title: "Python & Machine Learning Engineering Benchmark Mocks 2026",
        category: "Skill",
        examType: "Engineering",
        logoType: "general",
        users: "34.1k",
        totalTests: 80,
        freeTests: 3,
        languages: "Python",
        highlights: [
            "10 Timed Coding Tests",
            "35 Applied ML Problem Sets",
            "All-India Developer Leaderboard"
        ],
        moreTestsCount: 35,
        description: "Practical coding tests testing Pandas data manipulation, Model training, vectorization, and SQL joins.",
        duration: "60 mins",
        questions: 15,
        goalId: "skills",
        tags: ["skills", "coding", "python", "ai"]
    },
    {
        id: "current-affairs-quizzes",
        title: "Daily & Monthly Current Affairs Speed Quizzes 2026",
        category: "Current Affairs",
        examType: "Civil Services",
        logoType: "general",
        users: "185.3k",
        totalTests: 365,
        freeTests: 50,
        languages: "English, Hindi",
        highlights: [
            "Daily 10-Question High Speed Flash Quizzes",
            "Monthly Comprehensive Current Affairs Compilations",
            "PIB, Hindu & Express Trend Analysis"
        ],
        moreTestsCount: 300,
        description: "Fresh daily exam-oriented current affairs quizzes strictly aligned with Civil Services and State exams.",
        duration: "15 mins",
        questions: 15,
        goalId: "all",
        tags: ["current-affairs", "quiz", "daily"]
    }
]

export function getTestSeriesById(id: string): TestSeriesItem | undefined {
    if (!id) return undefined
    const clean = id.trim().toLowerCase()
    return TEST_SERIES_DATA.find(
        (s) => s.id.toLowerCase() === clean || s.title.toLowerCase().includes(clean)
    )
}

export function getTestSeriesForGoal(goalId: string): TestSeriesItem[] {
    if (!goalId || goalId === "all") return TEST_SERIES_DATA
    const gid = goalId.toLowerCase()
    return TEST_SERIES_DATA.filter((s) => {
        if (s.goalId === gid) return true
        if (gid === "upsc" && s.category === "UPSC") return true
        if (gid === "bpsc" && (s.category === "BPSC" || s.category === "BPSC TRE")) return true
        if (s.tags?.includes(gid)) return true
        return false
    })
}

export function getDefaultTestSectionsForSeries(seriesId: string): DefaultTestSection[] {
    const isUpsc = seriesId.includes("upsc")
    const isSchool = seriesId.includes("class")
    const isSkill = seriesId.includes("skill")

    if (isUpsc) {
        return [
            {
                id: "full-tests",
                title: "Full Length Mock Tests (Simulated CSE Prelims)",
                count: 8,
                tests: [
                    {
                        id: "upsc-ft-1",
                        title: "UPSC CSE Prelims Full Mock 1: GS Paper I (All-India Simulated Exam)",
                        questions: 100,
                        marks: 200,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: true,
                        attempts: 38200
                    },
                    {
                        id: "upsc-ft-2",
                        title: "UPSC CSE Prelims Full Mock 2: CSAT Paper II (Aptitude & Comprehension)",
                        questions: 80,
                        marks: 200,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: true,
                        attempts: 29500
                    },
                    {
                        id: "upsc-ft-3",
                        title: "UPSC CSE Prelims Full Mock 3: High Yield Economic Survey & Budget Special",
                        questions: 100,
                        marks: 200,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: false,
                        attempts: 21400
                    }
                ]
            },
            {
                id: "sectional-tests",
                title: "Subject-Wise Sectional Tests",
                count: 14,
                tests: [
                    {
                        id: "upsc-sec-polity",
                        title: "UPSC Sectional Test: Indian Polity & Constitutional Amendments",
                        questions: 50,
                        marks: 100,
                        durationMinutes: 60,
                        languages: "English, Hindi",
                        isFree: true,
                        attempts: 18400
                    },
                    {
                        id: "upsc-sec-history",
                        title: "UPSC Sectional Test: Modern Indian History & Freedom Struggle",
                        questions: 50,
                        marks: 100,
                        durationMinutes: 60,
                        languages: "English, Hindi",
                        isFree: false,
                        attempts: 14200
                    },
                    {
                        id: "upsc-sec-geo",
                        title: "UPSC Sectional Test: Physical & World Geography",
                        questions: 50,
                        marks: 100,
                        durationMinutes: 60,
                        languages: "English, Hindi",
                        isFree: false,
                        attempts: 12900
                    }
                ]
            },
            {
                id: "pyps",
                title: "Previous Year Papers (Official UPSC CSE)",
                count: 10,
                tests: [
                    {
                        id: "upsc-pyp-2025",
                        title: "UPSC CSE Prelims 2025 GS Paper 1 (Official Re-attempt with Analysis)",
                        questions: 100,
                        marks: 200,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: true,
                        attempts: 45600
                    },
                    {
                        id: "upsc-pyp-2024",
                        title: "UPSC CSE Prelims 2024 GS Paper 1 (Official Re-attempt with Analysis)",
                        questions: 100,
                        marks: 200,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: false,
                        attempts: 39800
                    }
                ]
            }
        ]
    }

    if (isSchool) {
        return [
            {
                id: "full-tests",
                title: "Board / School Full Term Simulated Exams",
                count: 5,
                tests: [
                    {
                        id: "school-ft-1",
                        title: "Full Term Mathematics & Science Mock Paper 1",
                        questions: 40,
                        marks: 80,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: true,
                        attempts: 12000
                    },
                    {
                        id: "school-ft-2",
                        title: "Full Term Social Science & Language Mock Paper 2",
                        questions: 40,
                        marks: 80,
                        durationMinutes: 120,
                        languages: "English, Hindi",
                        isFree: false,
                        attempts: 8400
                    }
                ]
            },
            {
                id: "sectional-tests",
                title: "Chapter Practice Tests",
                count: 20,
                tests: [
                    {
                        id: "school-sec-1",
                        title: "Science: Matter & Energy Chapter Practice Quiz",
                        questions: 20,
                        marks: 20,
                        durationMinutes: 20,
                        languages: "English, Hindi",
                        isFree: true,
                        attempts: 9500
                    }
                ]
            }
        ]
    }

    if (isSkill) {
        return [
            {
                id: "full-tests",
                title: "Company Technical Online Assessments (OA)",
                count: 6,
                tests: [
                    {
                        id: "skill-oa-1",
                        title: "FAANG Level Online Assessment Simulated Mock 1",
                        questions: 4,
                        marks: 100,
                        durationMinutes: 90,
                        languages: "Python, C++, Java, JS",
                        isFree: true,
                        attempts: 15400
                    }
                ]
            }
        ]
    }

    // Default BPSC style
    return [
        {
            id: "full-tests",
            title: "Full Tests (Latest Pattern)",
            count: 10,
            tests: [
                {
                    id: "bpsc-ft-1",
                    title: "72nd BPSC Prelims Full Mock Test 1 (New 4-Option Negative Marking)",
                    questions: 150,
                    marks: 150,
                    durationMinutes: 120,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 42300
                },
                {
                    id: "bpsc-ft-2",
                    title: "72nd BPSC Prelims Full Mock Test 2 (Sectional Standard Pattern)",
                    questions: 150,
                    marks: 150,
                    durationMinutes: 120,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 31200
                },
                {
                    id: "bpsc-ft-3",
                    title: "72nd BPSC Prelims Full Mock Test 3 (High Yield Target 110+)",
                    questions: 150,
                    marks: 150,
                    durationMinutes: 120,
                    languages: "English, Hindi",
                    isFree: false,
                    attempts: 24800
                }
            ]
        },
        {
            id: "sectional-tests",
            title: "Sectional Tests (Subject-wise & Mini Mocks)",
            count: 23,
            tests: [
                {
                    id: "bpsc-st-mini-gs",
                    title: "72nd BPSC Sectional Mock Test: General Studies (5 Questions)",
                    questions: 5,
                    marks: 5,
                    durationMinutes: 10,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 1420
                },
                {
                    id: "bpsc-st-1",
                    title: "BPSC Prelims Sectional Test 1: Indian Polity & Governance",
                    questions: 30,
                    marks: 30,
                    durationMinutes: 25,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 9800
                },
                {
                    id: "bpsc-st-2",
                    title: "BPSC Prelims Sectional Test 2: Modern History & Freedom Movement",
                    questions: 30,
                    marks: 30,
                    durationMinutes: 25,
                    languages: "English, Hindi",
                    isFree: false,
                    attempts: 7400
                }
            ]
        },
        {
            id: "chapter-tests",
            title: "Chapter Tests (Latest Pattern)",
            count: 131,
            tests: [
                {
                    id: "bpsc-ct-1",
                    title: "Ancient History of Bihar (Magadha, Maurya & Gupta Dynasties)",
                    questions: 25,
                    marks: 25,
                    durationMinutes: 20,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 18400
                }
            ]
        },
        {
            id: "blissful-bihar",
            title: "Blissful Bihar (आनंदमय बिहार - Special Bihar GK)",
            hindiTitle: "आनंदमय बिहार",
            count: 26,
            tests: [
                {
                    id: "bpsc-bb-1",
                    title: "Bihar Budget 2026-27 & Economic Survey High Yield Questions",
                    questions: 30,
                    marks: 30,
                    durationMinutes: 30,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 26400
                }
            ]
        },
        {
            id: "pyps",
            title: "Previous Year Papers (PYPs)",
            count: 16,
            tests: [
                {
                    id: "bpsc-pyp-70",
                    title: "70th BPSC Prelims Official Question Paper (Re-attempt Mode with Solutions)",
                    questions: 150,
                    marks: 150,
                    durationMinutes: 120,
                    languages: "English, Hindi",
                    isFree: true,
                    attempts: 54100
                }
            ]
        }
    ]
}
