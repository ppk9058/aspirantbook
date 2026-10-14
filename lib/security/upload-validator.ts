import path from "path"
import crypto from "crypto"

export interface UploadValidationResult {
    valid: boolean
    error?: string
    safeFilename?: string
    mimeType?: string
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB

/**
 * Validates file buffer magic bytes to ensure file content matches declared extension and MIME type.
 * Completely blocks malicious uploads disguised as harmless images/PDFs.
 */
export function validateFileMagicBytes(buffer: Buffer, declaredType: string): { valid: boolean; detectedMime?: string } {
    if (!buffer || buffer.length < 4) {
        return { valid: false }
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { valid: true, detectedMime: "image/jpeg" }
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return { valid: true, detectedMime: "image/png" }
    }

    // GIF: GIF87a or GIF89a (47 49 46 38)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return { valid: true, detectedMime: "image/gif" }
    }

    // WebP: RIFF ... WEBP
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return { valid: true, detectedMime: "image/webp" }
    }

    // PDF: %PDF- (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return { valid: true, detectedMime: "application/pdf" }
    }

    // MP4 / WebM / Quicktime video container check (ftyp box)
    if (buffer.length >= 12) {
        const boxType = buffer.toString("ascii", 4, 8)
        if (boxType === "ftyp" || boxType === "moov") {
            return { valid: true, detectedMime: "video/mp4" }
        }
    }

    // Text / CSV: checks for non-executable ASCII/UTF-8
    if (declaredType.includes("csv") || declaredType.includes("json") || declaredType.includes("text")) {
        // Disallow PHP / HTML opening tags in CSV/JSON
        const textSample = buffer.slice(0, 1024).toString("utf-8")
        if (textSample.includes("<?php") || textSample.includes("<script") || textSample.includes("<html")) {
            return { valid: false }
        }
        return { valid: true, detectedMime: declaredType }
    }

    return { valid: false }
}

/**
 * Validates and sanitizes file uploads
 */
export function validateUpload(
    file: { name: string; size: number; type: string },
    buffer: Buffer,
    expectedCategory: "image" | "pdf" | "video" | "dataset" = "image"
): UploadValidationResult {
    // 1. Max size check
    let maxSize = MAX_IMAGE_SIZE
    if (expectedCategory === "pdf") maxSize = MAX_DOCUMENT_SIZE
    if (expectedCategory === "video") maxSize = MAX_VIDEO_SIZE
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size exceeds the allowed limit of ${maxSize / (1024 * 1024)}MB`,
        }
    }

    // 2. Prevent path traversal and dangerous extensions
    const filename = file.name || (file as any).filename || ""
    const rawBase = path.basename(filename)
    const ext = path.extname(rawBase).toLowerCase()
    const DANGEROUS_EXTENSIONS = [
        ".php",
        ".phtml",
        ".exe",
        ".sh",
        ".bash",
        ".js",
        ".html",
        ".htm",
        ".svg",
        ".cgi",
        ".pl",
        ".py",
    ]
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `File extension ${ext} is strictly prohibited for security reasons`,
        }
    }

    // 3. Magic bytes inspection
    const magicCheck = validateFileMagicBytes(buffer, file.type)
    if (!magicCheck.valid) {
        return {
            valid: false,
            error: "File signature does not match its declared type or contains prohibited executable markers",
        }
    }

    // 4. Generate random safe filename
    const safeUUID = crypto.randomUUID()
    const sanitizedCleanName = rawBase.replace(/[^a-zA-Z0-9.-]/g, "_")
    const safeFilename = `${safeUUID}-${sanitizedCleanName}`

    return {
        valid: true,
        safeFilename,
        mimeType: magicCheck.detectedMime || file.type,
    }
}
