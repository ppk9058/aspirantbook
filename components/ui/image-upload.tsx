"use client"

import { useState, useRef } from "react"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ImageUploadProps {
    value?: string
    onChange: (url: string) => void
    onRemove?: () => void
    disabled?: boolean
    folder?: string
}

export function ImageUpload({
    value,
    onChange,
    onRemove,
    disabled = false,
    folder = "images",
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file")
            return
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB")
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

            // Upload file to S3
            const uploadResponse = await fetch(presignedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            })

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload file")
            }

            setProgress(100)
            onChange(url)
        } catch (error) {
            console.error("Upload error:", error)
            alert(error instanceof Error ? error.message : "Failed to upload image")
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
                accept="image/*"
                onChange={handleFileSelect}
                disabled={disabled || uploading}
                className="hidden"
            />

            {value ? (
                <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                    <Image
                        src={value}
                        alt="Uploaded image"
                        fill
                        className="object-cover"
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
                        relative aspect-video w-full max-w-md rounded-lg border-2 border-dashed
                        flex flex-col items-center justify-center gap-2
                        ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary"}
                    `}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Uploading... {progress}%</p>
                        </>
                    ) : (
                        <>
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-sm font-medium">Click to upload image</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
