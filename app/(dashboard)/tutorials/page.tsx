import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { TutorialsClientView, TutorialItem } from "./TutorialsClientView"

export const revalidate = 60

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aspirantbook.com"

export const metadata = {
    title: "Tutorials - aspirantbook",
    description: "Explore interactive text tutorials, code walkthroughs, and step-by-step curriculum.",
    alternates: {
        canonical: `${siteUrl}/tutorials`,
    },
    openGraph: {
        title: "Tutorials - aspirantbook",
        description: "Explore interactive text tutorials, code walkthroughs, and step-by-step curriculum.",
        url: `${siteUrl}/tutorials`,
        type: "website",
    },
}

// Fallback tutorials matching existing database tutorials if DB is temporarily unreachable
const FALLBACK_TUTORIALS: TutorialItem[] = [
    {
        id: "cmiixtaz40000xpdblykjk4m4",
        title: "Generative AI",
        slug: "generative-ai",
        description: "Master modern Generative AI, Large Language Models, Prompt Engineering, and RAG architectures.",
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        technology: "Deep Learning,AI,Gen AI",
        chapters: [
            {
                id: "gen-ch1",
                title: "Introduction to Foundation Models",
                lessons: [
                    { id: "gen-l1", title: "What are LLMs and Transformers?" },
                    { id: "gen-l2", title: "Prompt Engineering & Few-Shot Learning" },
                ],
            },
            {
                id: "gen-ch2",
                title: "Embeddings & Vector Databases",
                lessons: [
                    { id: "gen-l3", title: "High-Dimensional Vector Spaces & Cosine Similarity" },
                ],
            },
        ],
        _count: { enrollments: 342 },
    },
    {
        id: "cmtysle1o0000xpgzgh77thhk",
        title: "Intro to Python",
        slug: "intro-to-python",
        description: "Learn Python from the ground up: syntax, data structures, control flow, functions, and OOP.",
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        technology: "Python",
        chapters: [
            {
                id: "py-ch1",
                title: "Python Fundamentals & Syntax",
                lessons: [
                    { id: "py-l1", title: "Variables, Types, and String Formatting" },
                    { id: "py-l2", title: "Lists, Dictionaries, and Control Flow" },
                ],
            },
        ],
        _count: { enrollments: 890 },
    },
    {
        id: "cmtyt5drw0002xpon3e8pyueu",
        title: "Chapter 1: The Foundations of C — From Bare Metal to Execution",
        slug: "chapter-1-the-foundations-of-c-from-bare-metal-to-execution",
        description: "Deep dive into memory layout, pointers, stack and heap, system calls, and compilation pipelines.",
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        technology: "C",
        chapters: [
            {
                id: "c-ch1",
                title: "Bare Metal Memory & Pointers",
                lessons: [
                    { id: "c-l1", title: "Memory Architecture & Pointer Arithmetic" },
                    { id: "c-l2", title: "Stack vs Heap Allocation" },
                ],
            },
        ],
        _count: { enrollments: 512 },
    },
    {
        id: "cmii4rwbt0001xphj570fmrle",
        title: "ai course test",
        slug: "ai-course-test",
        description: "Hands-on testing and verification of AI models and reasoning frameworks.",
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        technology: "AI",
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
import { userGoalsMemoryMap } from "@/lib/user-goals-memory"
import { doesCategoryMatchGoal } from "@/lib/tutorials-goal-categories"

export default async function TutorialsPage() {
    const session = await auth()
    const userRole = session?.user?.role || null

    // Determine student's active Global Goal server-side:
    // 1. Session / DB if logged in
    // 2. Server memory map
    // 3. HTTP Cookie 'trillion_selected_goal'
    let currentGoal: string | null = null
    const cookieStore = await cookies()
    const cookieGoal = cookieStore.get("trillion_selected_goal")?.value || null

    if (session?.user?.id) {
        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { selectedGoal: true },
            })
            currentGoal = dbUser?.selectedGoal || userGoalsMemoryMap.get(session.user.id)?.goalId || cookieGoal || null
        } catch {
            currentGoal = userGoalsMemoryMap.get(session.user.id)?.goalId || cookieGoal || null
        }
    } else {
        currentGoal = cookieGoal || null
    }

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
            return true
        })

        // Filter by Global Goal server-side (query/data layer):
        // Edge cases:
        // - No goal set: show all tutorials (current behavior), no crash.
        // - Tutorial with no category: hidden for goal-filtered students, visible when no goal is set.
        const goalFilteredTutorials = textTutorials.filter((t) => {
            return doesCategoryMatchGoal(t.technology, currentGoal)
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
        } else if (!currentGoal) {
            tutorials = FALLBACK_TUTORIALS
        } else {
            tutorials = []
        }
    } catch (err: any) {
        console.warn("Database unavailable on /tutorials, serving fallback tutorials:", err.message)
        tutorials = !currentGoal ? FALLBACK_TUTORIALS : []
    }

    return (
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <TutorialsClientView initialTutorials={tutorials} userRole={userRole} currentGoal={currentGoal} />
        </div>
    )
}
