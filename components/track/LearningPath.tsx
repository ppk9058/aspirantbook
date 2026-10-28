"use client"

import { CheckCircle2, Lock, PlayCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Phase D: this component hardcoded `isCompleted = false` with a TODO, and the
 * track page never passed `userProgress`. Every step after the first was
 * therefore locked forever, and a finished course could never show as complete.
 *
 * Completion is now supplied by the page from the learner's real progress rows.
 */
export interface LearningPathCourse {
    id: string
    isRequired: boolean
    totalLessons: number
    completedLessons: number
    course: {
        id: string
        slug: string
        title: string
        description: string | null
    }
}

interface LearningPathProps {
    courses: LearningPathCourse[]
}

export function LearningPath({ courses }: LearningPathProps) {
    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
            {courses.map((item, index) => {
                const isCompleted =
                    item.totalLessons > 0 && item.completedLessons >= item.totalLessons
                const previous = courses[index - 1]
                const previousCompleted =
                    !previous ||
                    (previous.totalLessons > 0 && previous.completedLessons >= previous.totalLessons)
                const isLocked = !isCompleted && !previousCompleted

                return (
                    <div
                        key={item.id}
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                    >
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            {isCompleted ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                            ) : !isLocked ? (
                                <PlayCircle className="w-6 h-6 text-primary animate-pulse" />
                            ) : (
                                <Lock className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>

                        {/* Content Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Step {index + 1}
                                </span>
                                {item.isRequired && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        Required
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-lg mb-1">{item.course.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {item.course.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground mb-3">
                                {item.totalLessons > 0
                                    ? `${item.completedLessons} of ${item.totalLessons} lessons completed`
                                    : "Lessons are being added"}
                            </p>

                            <div className="flex items-center gap-2">
                                {isLocked ? (
                                    <Button variant="outline" size="sm" disabled className="w-full">
                                        <Lock className="w-3 h-3 mr-2" />
                                        Locked
                                    </Button>
                                ) : (
                                    <Link href={`/courses/${item.course.slug}`} className="w-full">
                                        <Button
                                            variant={isCompleted ? "secondary" : "default"}
                                            size="sm"
                                            className="w-full"
                                        >
                                            {isCompleted ? "Review Course" : "Start Course"}
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
