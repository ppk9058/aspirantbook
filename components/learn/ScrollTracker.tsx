"use client"

import { useEffect, useRef, useState } from "react"
import { trackVideoProgress } from "@/lib/actions/course/progress"

interface ScrollTrackerProps {
    lessonId: string
    onProgressUpdate?: (progress: number) => void
}

export default function ScrollTracker({ lessonId, onProgressUpdate }: ScrollTrackerProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [scrollProgress, setScrollProgress] = useState(0)
    const lastTrackedRef = useRef(0)

    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return

            const element = contentRef.current
            const scrollTop = element.scrollTop
            const scrollHeight = element.scrollHeight - element.clientHeight

            if (scrollHeight === 0) {
                setScrollProgress(100)
                return
            }

            const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100))
            setScrollProgress(progress)

            // Track every 10% progress
            const progressStep = Math.floor(progress / 10) * 10
            if (progressStep > lastTrackedRef.current && progressStep >= 10) {
                lastTrackedRef.current = progressStep

                // Track time spent (estimate based on scroll progress)
                const timeSpent = Math.floor(progressStep / 10) * 30 // 30 seconds per 10%
                trackVideoProgress(lessonId, timeSpent).catch((err) => console.warn("Scroll tracker warning:", err))

                if (onProgressUpdate) {
                    onProgressUpdate(progress)
                }
            }
        }

        const element = contentRef.current
        if (element) {
            element.addEventListener("scroll", handleScroll)
            return () => element.removeEventListener("scroll", handleScroll)
        }
    }, [lessonId, onProgressUpdate])

    return { contentRef, scrollProgress }
}

export { ScrollTracker }
