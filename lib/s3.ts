import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Lazily resolve S3 client with S3 / MinIO compatibility
export function getS3Client(): S3Client {
    const s3Endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT
    const s3ForcePathStyle =
        process.env.S3_FORCE_PATH_STYLE === 'true' ||
        process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ||
        Boolean(s3Endpoint && (s3Endpoint.includes('127.0.0.1') || s3Endpoint.includes('localhost')))

    return new S3Client({
        region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
        endpoint: s3Endpoint || undefined,
        forcePathStyle: s3ForcePathStyle,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
        },
    })
}

export function getBucketName(): string {
    return (
        process.env.AWS_S3_BUCKET_NAME ||
        process.env.AWS_S3_BUCKET ||
        process.env.S3_BUCKET ||
        'aspirantbook-uploads'
    )
}

// File type configurations
export const FILE_CONFIGS = {
    video: {
        maxSize: 500 * 1024 * 1024, // 500MB
        allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        folder: 'videos',
    },
    pdf: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['application/pdf'],
        folder: 'documents',
    },
    image: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        folder: 'images',
    },
    dataset: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ['text/csv', 'application/json', 'application/zip'],
        folder: 'datasets',
    },
}

export type FileType = keyof typeof FILE_CONFIGS

/**
 * Upload a file to S3
 */
export async function uploadToS3(
    file: File,
    fileType: FileType,
    customPath?: string
): Promise<{ url: string; key: string }> {
    const config = FILE_CONFIGS[fileType]

    // Validate file size
    if (file.size > config.maxSize) {
        throw new Error(
            `File size exceeds maximum allowed size of ${config.maxSize / (1024 * 1024)}MB`
        )
    }

    // Validate file type
    if (!config.allowedTypes.includes(file.type)) {
        throw new Error(
            `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`
        )
    }

    // Generate unique key
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = customPath || `${config.folder}/${timestamp}-${randomString}-${fileName}`

    try {
        const client = getS3Client()
        const bucketName = getBucketName()
        const s3Endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT
        const s3ForcePathStyle =
            process.env.S3_FORCE_PATH_STYLE === 'true' ||
            process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ||
            Boolean(s3Endpoint && (s3Endpoint.includes('127.0.0.1') || s3Endpoint.includes('localhost')))

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        })

        await client.send(command)

        // Construct URL
        const region = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1'
        const url = s3Endpoint
            ? (s3ForcePathStyle ? `${s3Endpoint}/${bucketName}/${key}` : `https://${bucketName}.${new URL(s3Endpoint).host}/${key}`)
            : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`

        return { url, key }
    } catch (error) {
        console.error('S3 upload error:', error)
        throw new Error('Failed to upload file to S3')
    }
}

/**
 * Get a presigned download URL for private files
 */
export async function getPrivateFileSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = getS3Client()
    const bucketName = getBucketName()
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    })
    return getSignedUrl(client, command, { expiresIn })
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
    try {
        const client = getS3Client()
        const bucketName = getBucketName()
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        })

        await client.send(command)
    } catch (error) {
        console.error('S3 delete error:', error)
        throw new Error('Failed to delete file from S3')
    }
}

/**
 * Generate a pre-signed URL for secure file access
 * Useful for private files that shouldn't be publicly accessible
 */
export async function getPresignedUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour default
): Promise<string> {
    try {
        const command = new GetObjectCommand({
            Bucket: getBucketName(),
            Key: key,
        })

        const url = await getSignedUrl(getS3Client(), command, { expiresIn })
        return url
    } catch (error) {
        console.error('S3 presigned URL error:', error)
        throw new Error('Failed to generate presigned URL')
    }
}

/**
 * Upload from URL (useful for copying files)
 */
export async function uploadFromUrl(
    url: string,
    fileType: FileType,
    customPath?: string
): Promise<{ url: string; key: string }> {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error('Failed to fetch file from URL')
        }

        const blob = await response.blob()
        const file = new File([blob], 'file', { type: blob.type })

        return await uploadToS3(file, fileType, customPath)
    } catch (error) {
        console.error('Upload from URL error:', error)
        throw new Error('Failed to upload file from URL')
    }
}

/**
 * Extract S3 key from URL
 */
export function extractS3Key(url: string): string | null {
    try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        // Remove leading slash
        return pathname.startsWith('/') ? pathname.substring(1) : pathname
    } catch {
        return null
    }
}

const s3ClientProxy = new Proxy({} as S3Client, {
    get(_target, prop) {
        return (getS3Client() as any)[prop]
    },
})

export default s3ClientProxy
