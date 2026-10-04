"use client"

import { useState, useRef } from "react"
import { Upload, X, Video as VideoIcon, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoUploadProps {
    value?: string
    onChange: (url: string) => void
    onRemove?: () => void
    disabled?: boolean
    folder?: string
}

export function VideoUpload({
    value,
    onChange,
    onRemove,
    disabled = false,
    folder = "videos",
}: VideoUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith("video/")) {
            alert("Please select a video file")
            return
        }

        // Validate file size (100MB max)
        if (file.size > 100 * 1024 * 1024) {
            alert("Video must be less than 100MB")
            return
        }

        try {
            setUploading(true)
            setProgress(0)

            // Get presigned URL from API
            const response = await fetch("/api/upload/presigned-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    fileSize: file.size,
                    folder,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Failed to get upload URL")
            }

            const { presignedUrl, url } = await response.json()

            // Upload file to S3 with progress tracking
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100)
                    setProgress(percentComplete)
                }
            })

            await new Promise((resolve, reject) => {
                xhr.addEventListener("load", () => {
                    if (xhr.status === 200) {
                        resolve(xhr.response)
                    } else {
                        reject(new Error("Upload failed"))
                    }
                })
                xhr.addEventListener("error", () => reject(new Error("Upload failed")))
                xhr.open("PUT", presignedUrl)
                xhr.setRequestHeader("Content-Type", file.type)
                xhr.send(file)
            })

            onChange(url)
        } catch (error) {
            console.error("Upload error:", error)
            alert(error instanceof Error ? error.message : "Failed to upload video")
        } finally {
            setUploading(false)
            setProgress(0)
        }
    }

    const handleRemove = () => {
        if (onRemove) {
            onRemove()
        } else {
            onChange("")
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={disabled || uploading}
                className="hidden"
            />

            {value ? (
                <div className="relative w-full max-w-2xl">
                    <video
                        src={value}
                        controls
                        className="w-full rounded-lg border"
                    />
                    {!disabled && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ) : (
                <div
                    onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                    className={`
                        relative aspect-video w-full max-w-2xl rounded-lg border-2 border-dashed
                        flex flex-col items-center justify-center gap-2
                        ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary"}
                    `}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Uploading... {progress}%</p>
                            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <VideoIcon className="h-8 w-8 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-sm font-medium">Click to upload video</p>
                                <p className="text-xs text-muted-foreground">MP4, WEBM up to 100MB</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
