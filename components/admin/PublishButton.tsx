"use client"

import { useState, useTransition, useEffect } from "react"
import { publishCourse, unpublishCourse } from "@/lib/actions/admin/publishing"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface PublishButtonProps {
    courseId: string
    status: string
    onStatusChange?: (newStatus: string) => void
}

export function PublishButton({ courseId, status: initialStatus, onStatusChange }: PublishButtonProps) {
    const [currentStatus, setCurrentStatus] = useState(initialStatus)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        setCurrentStatus(initialStatus)
    }, [initialStatus])

    const handlePublish = () => {
        startTransition(async () => {
            try {
                const res = await publishCourse(courseId)
                if (res?.success) {
                    setCurrentStatus("PUBLISHED")
                    onStatusChange?.("PUBLISHED")
                }
            } catch (err: any) {
                alert(err.message || "Failed to publish course")
            }
        })
    }

    const handleUnpublish = () => {
        startTransition(async () => {
            try {
                const res = await unpublishCourse(courseId)
                if (res?.success) {
                    setCurrentStatus("DRAFT")
                    onStatusChange?.("DRAFT")
                }
            } catch (err: any) {
                alert(err.message || "Failed to unpublish course")
            }
        })
    }

    if (currentStatus === "PUBLISHED") {
        return (
            <Button
                variant="outline"
                className="w-full border-2 border-amber-600 text-amber-800 hover:bg-amber-50 font-bold"
                onClick={handleUnpublish}
                disabled={isPending}
            >
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Switching to Draft...</span>
                    </>
                ) : (
                    <>
                        <XCircle className="h-4 w-4 mr-2 text-amber-600" />
                        <span>Revert to Draft</span>
                    </>
                )}
            </Button>
        )
    }

    return (
        <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-2 border-[#10162F] shadow-[2px_2px_0px_#10162F]"
            onClick={handlePublish}
            disabled={isPending}
        >
            {isPending ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Publishing Course...</span>
                </>
            ) : (
                <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Publish Course (Live)</span>
                </>
            )}
        </Button>
    )
}
