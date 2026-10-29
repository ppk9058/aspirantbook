import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

interface S3Config {
    region: string
    bucketName: string
    accessKeyId: string
    secretAccessKey: string
    endpoint?: string
    forcePathStyle?: boolean
}

/**
 * Resolves S3 configuration at call time and fails with an explicit error when a
 * required environment variable is missing (instead of crashing on a non-null assertion).
 */
function getS3Config(): S3Config {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY
    const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET

    if (!accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error(
            "S3 is not configured: AWS_ACCESS_KEY_ID (or S3_ACCESS_KEY), AWS_SECRET_ACCESS_KEY (or S3_SECRET_KEY) and AWS_S3_BUCKET_NAME (or S3_BUCKET) are required"
        )
    }

    const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT
    const forcePathStyle =
        process.env.S3_FORCE_PATH_STYLE === "true" ||
        process.env.AWS_S3_FORCE_PATH_STYLE === "true" ||
        Boolean(endpoint && (endpoint.includes("127.0.0.1") || endpoint.includes("localhost")))

    return {
        region: process.env.AWS_REGION || process.env.S3_REGION || "us-east-1",
        bucketName,
        accessKeyId,
        secretAccessKey,
        endpoint,
        forcePathStyle,
    }
}

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
    if (!s3Client) {
        const config = getS3Config()
        s3Client = new S3Client({
            region: config.region,
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        })
    }
    return s3Client
}
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        })
    }
    return s3Client
}

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
    const { bucketName } = getS3Config()
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    })

    const url = await getSignedUrl(getS3Client(), command, { expiresIn })
    return url
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
    const { bucketName } = getS3Config()
    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
    })

    await getS3Client().send(command)
}

/**
 * Get the public URL for an S3 object
 */
export function getS3Url(key: string): string {
    const { region, bucketName } = getS3Config()

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
