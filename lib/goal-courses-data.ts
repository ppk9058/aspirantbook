export interface GoalCourse {
    id: string
    title: string
    slug: string
    description: string
    thumbnailUrl: string
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    rating: number
    enrollmentCount: number
    duration: string
    isPremium: boolean
    tags: string[]
    goalId: string
    category: string
    subject: string
    lessonsCount: number
}

export const ALL_GOAL_COURSES: GoalCourse[] = []
