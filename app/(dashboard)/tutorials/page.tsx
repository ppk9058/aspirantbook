import { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { TutorialsClientView, TutorialItem } from "./TutorialsClientView"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    title: "Text-Based Tutorials | aspirantbook",
    description: "In-depth, step-by-step reading tutorials with interactive code blocks, diagrams, and curriculum authored in Tutorial Studio.",
}

const FALLBACK_TUTORIALS: TutorialItem[] = [
    {
        id: "tut-agentic-engineering",
        title: "Agentic Engineering: Zero to Hero",
        slug: "agentic-engineering-zero-to-hero",
        description: "The complete 35-chapter masterclass on production agentic AI, tool calling, multi-agent swarms, verification, and automated evaluation.",
        status: "PUBLISHED",
        difficulty: "ADVANCED",
        technology: "Skill & Tech",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
            {
                id: "ae-ch1",
                title: "Introduction to Agentic Architectures",
                lessons: [
                    { id: "ae-l1", title: "Why Deterministic Code Meets Autonomous Agents" },
                    { id: "ae-l2", title: "State Machines vs Autonomous Loops" },
                ],
            },
            {
                id: "ae-ch2",
                title: "Tool Calling & Action Protocol",
                lessons: [
                    { id: "ae-l3", title: "JSON Schema Definitions & Tool Routing" },
                    { id: "ae-l4", title: "Error Handling & Self-Correction Loops" },
                ],
            },
        ],
        _count: { enrollments: 342 },
    },
    {
        id: "tut-pyq-masterclass",
        title: "UPSC CSE GS-1 Conceptual Blueprint",
        slug: "upsc-cse-gs1-conceptual-blueprint",
        description: "In-depth textual breakdown of core concepts across Indian Polity, Modern History, Geography, and Economy.",
        status: "PUBLISHED",
        difficulty: "INTERMEDIATE",
        technology: "UPSC",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
            {
                id: "upsc-t-ch1",
                title: "Constitutional Framework & Preamble",
                lessons: [{ id: "upsc-t-l1", title: "Basic Structure Doctrine & Evolution" }],
            },
        ],
        _count: { enrollments: 890 },
    },
    {
        id: "tut-bpsc-special",
        title: "BPSC Prelims & Mains Complete Bihar Special",
        slug: "bpsc-prelims-mains-bihar-special",
        description: "Exhaustive textual primer on Bihar History, Geography, Economy, Economic Survey, and State Governance for 71st and 72nd CCE.",
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        technology: "BPSC",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
            {
                id: "bpsc-t-ch1",
                title: "Ancient History of Bihar",
                lessons: [{ id: "bpsc-t-l1", title: "Magadha Empire & Mauryan Administration" }],
            },
        ],
        _count: { enrollments: 520 },
    },
    {
        id: "tut-genai-mastery",
        title: "Generative AI Systems & Prompt Engineering",
        slug: "generative-ai-systems-mastery",
        description: "Hands-on reading guide covering LLM foundations, context window management, structured outputs, embeddings, and vector databases.",
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        technology: "Skill & Tech",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
            {
                id: "ai-t-ch1",
                title: "Testing AI Outputs & Grounding",
                lessons: [{ id: "ai-t-l1", title: "Hallucination Detection & Benchmarks" }],
            },
        ],
        _count: { enrollments: 120 },
    },
]

import { cookies } from "next/headers"
import { getStudentGoals } from "@/lib/goals/student-goals"
import { doesCategoryMatchAnyGoal } from "@/lib/goals/goal-filters"

export default async function TutorialsPage() {
    const session = await auth()
    const userRole = session?.user?.role || null

    // Determine student's active Global Goals server-side (authoritative DB source):
    const cookieStore = await cookies()
    const cookieGoal = cookieStore.get("trillion_selected_goal")?.value || null
    const { goalIds, primaryGoal } = await getStudentGoals(session?.user?.id, cookieGoal)

    let tutorials: TutorialItem[] = []

    try {
        const dbCourses = await prisma.course.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                chapters: {
                    orderBy: { order: "asc" },
                    include: {
                        lessons: {
                            orderBy: { order: "asc" },
                            select: { id: true, title: true, type: true, videoUrl: true },
                        },
                    },
                },
                _count: {
                    select: { enrollments: true },
                },
            },
        })

        const isStaff = userRole === "ADMIN" || userRole === "TEACHER"

        // Strictly include ONLY text-based tutorials created in Tutorial Studio
        // Video courses belong exclusively to the Courses menu
        const textTutorials = dbCourses.filter((c) => {
            if (c.slug === "72nd-bpsc-prelims-current-affairs") return false
            const lowerTitle = (c.title || "").toLowerCase()
            const lowerSlug = (c.slug || "").toLowerCase()
            if (lowerTitle.includes("video course") || lowerTitle.includes("video tutorial") || lowerSlug.includes("video")) {
                return false
            }
            const allLessons = c.chapters?.flatMap((ch: any) => ch.lessons || []) || []
            const hasVideoLessons = allLessons.some((l: any) => Boolean(l.videoUrl) || l.type === "VIDEO")
            if (hasVideoLessons) return false

            // Hide tutorials with 0 lessons from student listings (still visible to teacher/admin and Studio)
            if (!isStaff && allLessons.length === 0) {
                return false
            }

            return true
        })

        // Filter by Global Goal server-side (query/data layer with OR logic for multi-goal):
        const goalFilteredTutorials = textTutorials.filter((t) => {
            return doesCategoryMatchAnyGoal(t.technology, goalIds)
        })

        if (goalFilteredTutorials.length > 0) {
            tutorials = goalFilteredTutorials.map((t) => ({
                id: t.id,
                title: t.title,
                slug: t.slug,
                description: t.description,
                status: t.status,
                difficulty: t.difficulty,
                technology: t.technology,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                chapters: t.chapters?.map((ch) => ({
                    id: ch.id,
                    title: ch.title,
                    order: ch.order,
                    lessons: ch.lessons.map((l) => ({
                        id: l.id,
                        title: l.title,
                        type: l.type,
                        videoUrl: l.videoUrl,
                    })),
                })),
                _count: t._count,
            }))
        } else {
            // Do not re-enable hardcoded fallback tutorials. Return empty array for strict goal isolation
            tutorials = []
        }
    } catch (err: any) {
        console.warn("Database error on /tutorials:", err.message)
        tutorials = []
    }

    return (
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
            <TutorialsClientView
                key={goalIds.join(",") || "all"}
                initialTutorials={tutorials}
                userRole={userRole}
                currentGoal={primaryGoal}
                goalIds={goalIds}
            />
        </div>
    )
}
