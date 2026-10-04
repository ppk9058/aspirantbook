"use client"

import { PracticeEnvironment } from "@/components/practice/PracticeEnvironment"

interface CodingExerciseProps {
    title: string
    instructions: string
    starterCode: string
    onComplete: () => void
}

export function CodingExercise(props: CodingExerciseProps) {
    return <PracticeEnvironment {...props} />
}
