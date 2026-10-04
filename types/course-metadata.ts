export interface CourseCustomMetadata {
    courseId: string
    // "This course includes" section
    featuresTitle: string
    features: string[]

    // Stat: Projects count
    projectCount: number

    // "Skills you will gain" section
    skillsTitle: string
    skills: string[]

    updatedAt?: string
}

export const DEFAULT_FEATURES_TITLE = "This course includes"
export const DEFAULT_FEATURES: string[] = [
    "AI assistance for guided coding help",
    "Projects to apply new skills",
    "Quizzes to test your knowledge",
    "A certificate of completion",
]

export const DEFAULT_SKILLS_TITLE = "Skills you'll gain"
export const DEFAULT_SKILLS: string[] = [
    "Build core programming concepts",
    "Write modular, object-oriented software",
    "Implement efficient data structures and algorithms",
    "Debug code and fix complex runtime exceptions",
    "Publish completed capstone portfolio projects",
]

export const DEFAULT_PROJECT_COUNT = 14
