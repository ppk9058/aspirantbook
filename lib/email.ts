import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { isDbPersist } from "@/lib/storage/persist-backend"

export interface SendEmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

export interface SendEmailResult {
    success: boolean
    id?: string
    provider?: string
    queued?: boolean
    error?: string
}

export interface DevEmail {
    id: string
    to: string
    subject: string
    html: string
    text?: string
    link?: string
    token?: string
    createdAt: string
}

const OUTBOX_DIR = path.join(process.cwd(), "logs")
const OUTBOX_FILE = path.join(OUTBOX_DIR, "dev-email-outbox.jsonl")

function parseFromAddress(): { name: string; email: string } {
    const fromRaw = process.env.EMAIL_FROM || "AspirantBook <no-reply@aspirantbook.com>"
    const match = fromRaw.match(/^(.*?)\s*<([^>]+)>$/)
    if (match) {
        return { name: match[1].trim(), email: match[2].trim() }
    }
    return { name: "AspirantBook", email: fromRaw.trim() }
}

async function sendViaBrevo(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
        return { success: false, error: "BREVO_API_KEY is not configured" }
    }

    const { name, email } = parseFromAddress()
    const endpoint = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email"

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                sender: { name, email },
                to: [{ email: options.to }],
                subject: options.subject,
                htmlContent: options.html,
                textContent: options.text || options.html.replace(/<[^>]+>/g, " ").trim(),
            }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout))

        if (!res.ok) {
            const errText = await res.text()
            return { success: false, error: `Brevo HTTP ${res.status}: ${errText}` }
        }

        const data = (await res.json()) as any
        return { success: true, id: data.messageId || data.id || "brevo_sent" }
    } catch (err: any) {
        return { success: false, error: err?.message || String(err) }
    }
}

async function sendViaResend(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        return { success: false, error: "RESEND_API_KEY is not configured" }
    }

    const { name, email } = parseFromAddress()
    const fromFormatted = `${name} <${email}>`
    const endpoint = process.env.RESEND_API_URL || "https://api.resend.com/emails"

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: fromFormatted,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout))

        if (!res.ok) {
            const errText = await res.text()
            return { success: false, error: `Resend HTTP ${res.status}: ${errText}` }
        }

        const data = (await res.json()) as any
        return { success: true, id: data.id || "resend_sent" }
    } catch (err: any) {
        return { success: false, error: err?.message || String(err) }
    }
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<SendEmailResult> {
    const isProduction = process.env.NODE_ENV === "production"
    const appEnv = process.env.APP_ENV || ""
    const hasBrevo = Boolean(process.env.BREVO_API_KEY)
    const hasResend = Boolean(process.env.RESEND_API_KEY)
    const hasAnyProvider = hasBrevo || hasResend

    const canWriteOutbox = !isProduction || appEnv === "test" || process.env.NODE_ENV === "test"
    const isDevOrTest = canWriteOutbox

    // Extract any token or link from HTML / text
    const linkMatch = html.match(/href="([^"]+)"/) || text?.match(/https?:\/\/[^\s]+/)
    const link = linkMatch ? linkMatch[1] : undefined
    let token: string | undefined
    if (link) {
        try {
            const parsedUrl = new URL(link, "http://localhost")
            token = parsedUrl.searchParams.get("token") || undefined
        } catch {}
    }

    // Dev/Test mode with no live API credentials: write to local outbox without failing
    if (isDevOrTest && !hasAnyProvider) {
        if (isDbPersist()) {
            try {
                const record = await prisma.emailOutbox.create({
                    data: {
                        to,
                        subject,
                        html,
                        text,
                        link,
                        token,
                        status: "PENDING",
                        provider: "dev",
                        attempts: 0,
                    },
                })
                console.info(`[DbEmailOutbox] Stored to: ${to} | Subject: ${subject} | Link: ${link || "none"}`)
                return { success: true, id: record.id, provider: "dev_outbox" }
            } catch (err) {
                console.error("[DbEmailOutbox] Failed to write outbox record:", err)
                return { success: false, error: "Failed to persist to email outbox" }
            }
        }

        try {
            if (!fs.existsSync(OUTBOX_DIR)) {
                fs.mkdirSync(OUTBOX_DIR, { recursive: true })
            }

            const record: DevEmail = {
                id: `dev-mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                to,
                subject,
                html,
                text,
                link,
                token,
                createdAt: new Date().toISOString(),
            }

            fs.appendFileSync(OUTBOX_FILE, JSON.stringify(record) + "\n", "utf-8")
            console.info(`[DevEmailOutbox] Sent to: ${to} | Subject: ${subject} | Link: ${link || "none"}`)
            return { success: true, id: record.id, provider: "dev_fs" }
        } catch (err) {
            console.error("[DevEmailOutbox] Failed to write outbox record:", err)
            return { success: false, error: "Failed to write outbox file" }
        }
    }

    let brevoError = ""
    let resendError = ""

    // 1. Try Primary Provider (Brevo)
    if (hasBrevo) {
        const brevoResult = await sendViaBrevo({ to, subject, html, text })
        if (brevoResult.success) {
            return { success: true, id: brevoResult.id, provider: "brevo" }
        }
        brevoError = brevoResult.error || "Unknown Brevo error"
        console.warn(`[Email] Primary provider (Brevo) failed: ${brevoError}. Attempting fallback (Resend)...`)
    } else {
        brevoError = "Brevo not configured"
    }

    // 2. Try Fallback Provider (Resend)
    if (hasResend) {
        const resendResult = await sendViaResend({ to, subject, html, text })
        if (resendResult.success) {
            return { success: true, id: resendResult.id, provider: "resend" }
        }
        resendError = resendResult.error || "Unknown Resend error"
        console.warn(`[Email] Fallback provider (Resend) failed: ${resendError}.`)
    } else {
        resendError = "Resend not configured"
    }

    // 3. Both failed (or no provider configured in production): Queue to EmailOutbox table for retry
    console.error(`[Email] All email delivery providers failed. Queuing message to ${to} into EmailOutbox for background retry.`)
    const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes retry window

    try {
        const queuedRecord = await prisma.emailOutbox.create({
            data: {
                to,
                subject,
                html,
                text,
                link,
                token,
                status: "PENDING",
                provider: hasBrevo ? "brevo_fallback_failed" : "no_provider",
                error: `Primary: ${brevoError}; Fallback: ${resendError}`,
                attempts: 1,
                nextRetryAt,
            },
        })
        return {
            success: false,
            id: queuedRecord.id,
            queued: true,
            error: "Providers unavailable; email queued for retry in 5 minutes",
        }
    } catch (dbErr) {
        console.error("[Email] Failed to queue failed email to EmailOutbox:", dbErr)
        return {
            success: false,
            queued: false,
            error: `Email failed and could not queue: ${brevoError}; ${resendError}`,
        }
    }
}

export async function readLatestDevEmail(to?: string): Promise<DevEmail | null> {
    if (isDbPersist()) {
        try {
            const entry = await prisma.emailOutbox.findFirst({
                where: to ? { to: { equals: to, mode: "insensitive" } } : {},
                orderBy: { createdAt: "desc" },
            })
            if (!entry) return null
            return {
                id: entry.id,
                to: entry.to,
                subject: entry.subject,
                html: entry.html || "",
                text: entry.text || undefined,
                link: entry.link || undefined,
                token: entry.token || undefined,
                createdAt: entry.createdAt.toISOString(),
            }
        } catch {
            return null
        }
    }

    try {
        if (!fs.existsSync(OUTBOX_FILE)) return null
        const content = fs.readFileSync(OUTBOX_FILE, "utf-8").trim()
        if (!content) return null
        const lines = content.split("\n").filter(Boolean)
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const item: DevEmail = JSON.parse(lines[i])
                if (!to || item.to.toLowerCase() === to.toLowerCase()) {
                    return item
                }
            } catch {}
        }
        return null
    } catch {
        return null
    }
}
