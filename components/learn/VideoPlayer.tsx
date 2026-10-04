"use client"

import { useRef, useState, useEffect } from "react"
import ReactPlayer from "react-player"
import { trackVideoProgress } from "@/lib/actions/course/progress"

interface VideoPlayerProps {
    url: string
    lessonId: string
    onComplete?: () => void
}

export default function VideoPlayer({ url, lessonId, onComplete }: VideoPlayerProps) {
    const [mounted, setMounted] = useState(false)
    const playerRef = useRef<any>(null)
    const lastProgressRef = useRef(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleProgress = (state: { playedSeconds: number; played: number }) => {
        const currentTime = Math.floor(state.playedSeconds)

        // Track every 30 seconds
        if (currentTime - lastProgressRef.current >= 30) {
            const timeSpent = currentTime - lastProgressRef.current
            trackVideoProgress(lessonId, timeSpent).catch((e) => console.warn("Video progress track error:", e))
            lastProgressRef.current = currentTime
        }

        // Auto-complete at 90%
        if (state.played > 0.9 && onComplete) {
            onComplete()
        }
    }

    if (!mounted) {
        return <div className="relative aspect-video bg-black" aria-hidden="true" />
    }

    return (
        <div className="relative aspect-video bg-black">
            <ReactPlayer
                ref={playerRef}
                url={url}
                width="100%"
                height="100%"
                controls
                onProgress={handleProgress}
                config={{
                    file: {
                        attributes: {
                            controlsList: "nodownload",
                        },
                    },
                }}
            />
        </div>
    )
}
