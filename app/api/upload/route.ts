import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { hasPermission } from "@/lib/auth/permissions"
import { FileType } from "@/lib/s3"
import { prisma } from "@/lib/prisma"
import { storeUpload, uploadErrorResponse } from "@/lib/security/upload-policy"

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

        // A6: one shared policy — type allowlist, magic bytes, size cap, no SVG,
        // server-generated name, object storage in production.
        const buffer = Buffer.from(await file.arrayBuffer())
        const stored = await storeUpload({
            file,
            buffer,
            category: (['image', 'pdf', 'video', 'dataset'].includes(fileType) ? fileType : 'image') as any,
            folder: fileType || 'general',
        })

        const fileUrl = stored.url
        const fileKey = stored.key

        // Attempt database tracking if available
        let uploadId = `upload-${Date.now()}`
        try {
            if (userContext.userId && !userContext.userId.startsWith('demo-')) {
                const upload = await prisma.contentUpload.create({
                    data: {
                        uploadedBy: userContext.userId,
                        contentType: fileType,
                        fileName: stored.fileName,
                        fileSize: BigInt(stored.sizeKb * 1024),
                        mimeType: stored.mimeType,
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
                fileName: stored.fileName,
                fileSize: stored.sizeKb * 1024,
                mimeType: stored.mimeType,
            },
        })
    } catch (error: any) {
        console.error('File upload error:', error)
        const mapped = uploadErrorResponse(error)
        return NextResponse.json({ error: mapped.error }, { status: mapped.status })
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

        const upload = await prisma.contentUpload.findUnique({
            where: { id: uploadId },
        })

        if (!upload) {
            return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
        }

        if (userContext.role !== 'ADMIN' && upload.uploadedBy !== userContext.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (upload.s3Key) {
            try {
                const { deleteFromS3 } = await import('@/lib/s3')
                await deleteFromS3(upload.s3Key)
            } catch (err) {
                console.error('[upload] Failed to delete object from storage:', err)
            }
        }

        await prisma.contentUpload.delete({ where: { id: uploadId } })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('File delete error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete file' },
            { status: 500 }
        )
    }
}
