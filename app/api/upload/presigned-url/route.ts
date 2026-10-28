import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
    generatePresignedUrl,
    generateFileKey,
    validateFileType,
    validateFileSize,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
} from "@/lib/aws-s3"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
    try {
        const clientIp = getClientIp(req)
        const rl = await checkRateLimit(`upload_presigned:${clientIp}`, 20, 60, { failClosed: true })
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many upload requests. Please slow down." }, { status: 429 })
        }
        const session = await auth()

        // Only authenticated users can upload
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { filename, contentType, fileSize, folder = "uploads" } = body

        // Validate required fields
        if (!filename || !contentType || !fileSize) {
            return NextResponse.json(
                { error: "Missing required fields: filename, contentType, fileSize" },
                { status: 400 }
            )
        }

        // Determine allowed types and max size based on content type
        let allowedTypes: string[]
        let maxSize: number

        if (contentType.startsWith("image/")) {
            allowedTypes = ALLOWED_IMAGE_TYPES
            maxSize = MAX_IMAGE_SIZE
        } else if (contentType.startsWith("video/")) {
            allowedTypes = ALLOWED_VIDEO_TYPES
            maxSize = MAX_VIDEO_SIZE
        } else {
            return NextResponse.json(
                { error: "Unsupported file type. Only images and videos are allowed." },
                { status: 400 }
            )
        }

        // Validate file type
        if (!validateFileType(contentType, allowedTypes)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}` },
                { status: 400 }
            )
        }

        // Validate file size
        if (!validateFileSize(fileSize, maxSize)) {
            return NextResponse.json(
                { error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` },
                { status: 400 }
            )
        }

        // Fail with an actionable error before signing when storage is not configured.
        const region = process.env.AWS_REGION || "us-east-1"
        const bucketName = process.env.AWS_S3_BUCKET_NAME
        if (!bucketName) {
            console.error("AWS_S3_BUCKET_NAME is not configured; cannot return an upload URL")
            return NextResponse.json(
                { error: "File storage is not configured" },
                { status: 500 }
            )
        }

        // Generate unique file key
        const key = generateFileKey(folder, filename)

        // Generate presigned URL
        const presignedUrl = await generatePresignedUrl({
            key,
            contentType,
            expiresIn: 3600, // 1 hour
        })

        return NextResponse.json({
            presignedUrl,
            key,
            url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
        })
    } catch (error) {
        console.error("Error generating presigned URL:", error)
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        )
    }
}
