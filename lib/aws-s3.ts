import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!

export interface PresignedUrlOptions {
    key: string
    contentType: string
    expiresIn?: number
}

/**
 * Generate a presigned URL for uploading files directly to S3
 */
export async function generatePresignedUrl({
    key,
    contentType,
    expiresIn = 3600, // 1 hour default
}: PresignedUrlOptions): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    })

    const url = await getSignedUrl(s3Client, command, { expiresIn })
    return url
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    })

    await s3Client.send(command)
}

/**
 * Get the public URL for an S3 object
 */
export function getS3Url(key: string): string {
    const region = process.env.AWS_REGION || "us-east-1"
    const bucketName = process.env.AWS_S3_BUCKET_NAME!

    // If using CloudFront, return CloudFront URL
    if (process.env.AWS_CLOUDFRONT_DOMAIN) {
        return `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${key}`
    }

    // Otherwise return direct S3 URL
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

/**
 * Generate a unique file key for S3
 */
export function generateFileKey(folder: string, filename: string): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    return `${folder}/${timestamp}-${randomString}-${sanitizedFilename}`
}

/**
 * Validate file type
 */
export function validateFileType(contentType: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
        if (type.endsWith("/*")) {
            const baseType = type.split("/")[0]
            return contentType.startsWith(baseType + "/")
        }
        return contentType === type
    })
}

/**
 * Validate file size (in bytes)
 */
export function validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize
}

// File type constants
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
