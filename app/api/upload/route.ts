import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserContext } from '@/lib/auth/rbac'
import { hasPermission } from '@/lib/auth/permissions'
import { uploadToS3, FileType, FILE_CONFIGS } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        const userContext = await getCurrentUserContext()
        const isAuth = userContext.isAuthenticated || !!session?.user
        if (!isAuth) {
            return NextResponse.json({ error: 'Unauthorized: Please log in to upload files' }, { status: 401 })
        }

        let formData: FormData
        try {
            formData = await request.formData()
        } catch {
            return NextResponse.json({ error: 'Invalid form data or no file provided' }, { status: 400 })
        }

        const file = formData.get('file') as File | null
        const fileType = (formData.get('type') as FileType) || 'image'
        const courseId = formData.get('courseId') as string | null
        const chapterId = formData.get('chapterId') as string | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Rate limit uploads per user/IP
        const { checkRateLimit } = await import('@/lib/rate-limit')
        const rateCheck = await checkRateLimit(`upload:${userContext.userId || 'anon'}`, 30, 60)
        if (!rateCheck.allowed) {
            return NextResponse.json({ error: 'Too many upload requests. Please wait a moment.' }, { status: 429 })
        }

        // Validate upload magic bytes, file size, and extension
        const { validateUpload } = await import('@/lib/security/upload-validator')
        const buffer = Buffer.from(await file.arrayBuffer())
        const validation = validateUpload(file, buffer, (fileType as any) || 'image')
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error || 'Invalid file format or content' }, { status: 400 })
        }

        const safeFilename = validation.safeFilename || `${Date.now()}-upload`
        const fileKey = `${fileType || 'uploads'}/${safeFilename}`

        let fileUrl = ''
        let isLocalFallback = false

        // Try S3 upload first if credentials exist
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            try {
                const s3Result = await uploadToS3(file, fileType)
                fileUrl = s3Result.url
            } catch (s3Err) {
                console.warn('S3 upload unsuccessful, falling back to local file storage:', s3Err)
                isLocalFallback = true
            }
        } else {
            isLocalFallback = true
        }

        // Local storage fallback for seamless dev and test runs
        if (isLocalFallback) {
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', fileType || 'general')
            await fs.mkdir(uploadsDir, { recursive: true })
            const localFilePath = path.join(uploadsDir, safeFilename)
            await fs.writeFile(localFilePath, buffer)
            fileUrl = `/uploads/${fileType || 'general'}/${safeFilename}`
        }

        // Attempt database tracking if available
        let uploadId = `upload-${Date.now()}`
        try {
            if (userContext.userId && !userContext.userId.startsWith('demo-')) {
                const upload = await prisma.contentUpload.create({
                    data: {
                        uploadedBy: userContext.userId,
                        contentType: fileType,
                        fileName: file.name,
                        fileSize: BigInt(file.size),
                        mimeType: file.type,
                        fileUrl,
                        s3Key: fileKey,
                        status: 'READY',
                        associatedCourseId: courseId,
                        associatedChapterId: chapterId,
                        uploadCompletedAt: new Date(),
                    },
                })
                uploadId = upload.id
            }
        } catch (dbErr) {
            console.warn('Database upload record skipped (DB offline or demo session):', dbErr)
        }

        return NextResponse.json({
            success: true,
            upload: {
                id: uploadId,
                url: fileUrl,
                key: fileKey,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
            },
        })
    } catch (error: any) {
        console.error('File upload error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to upload file' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userContext = await getCurrentUserContext()
        if (!userContext.isAuthenticated) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const uploadId = searchParams.get('id')

        if (!uploadId) {
            return NextResponse.json({ error: 'Upload ID required' }, { status: 400 })
        }

        // In demo mode or DB offline
        try {
            const upload = await prisma.contentUpload.findUnique({
                where: { id: uploadId },
            })

            if (upload) {
                if (userContext.role !== 'ADMIN' && upload.uploadedBy !== userContext.userId) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }

                if (upload.s3Key) {
                    const { deleteFromS3 } = await import('@/lib/s3')
                    await deleteFromS3(upload.s3Key).catch(() => {})
                }

                await prisma.contentUpload.delete({
                    where: { id: uploadId },
                })
            }
        } catch {
            // DB offline, proceed
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('File delete error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete file' },
            { status: 500 }
        )
    }
}
