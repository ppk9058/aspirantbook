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

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
    const isProduction = process.env.NODE_ENV === "production"
    const appEnv = process.env.APP_ENV || ""
    const hasProvider = Boolean(process.env.RESEND_API_KEY)

    /**
     * C2: the old condition treated "production without RESEND_API_KEY" as a
     * dev environment, appended the message to logs/dev-email-outbox.jsonl — a
     * read-only, per-instance path on serverless — and returned
     * `{ success: true }`. A password-reset mail was then reported as sent while
     * nothing left the server. The outbox is now dev/test only and a production
     * deployment with no provider reports failure.
     */
    const canWriteOutbox = !isProduction || appEnv === "test" || process.env.NODE_ENV === "test"
    const isDevOrTest = canWriteOutbox

    if (!hasProvider && !canWriteOutbox) {
        console.error(
            "[Email] RESEND_API_KEY is not configured in production; refusing to report a message as sent."
        )
        return { success: false }
    }

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

    // In dev / test or when no production key is configured: log to dev-only outbox
    if (isDevOrTest) {
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
                        status: hasProvider ? "SENT" : "PENDING",
                        provider: hasProvider ? "resend" : "dev",
                    },
                })
                console.log(`[DbEmailOutbox] Stored to: ${to} | Subject: ${subject} | Link: ${link || "none"}`)
                return { success: true, id: record.id }
            } catch (err) {
                console.error("[DbEmailOutbox] Failed to write outbox record:", err)
                return { success: false }
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
            console.log(`[DevEmailOutbox] Sent to: ${to} | Subject: ${subject} | Link: ${link || "none"}`)
            return { success: true, id: record.id }
        } catch (err) {
            console.error("[DevEmailOutbox] Failed to write outbox record:", err)
            // Reporting success here hid a failed write; the caller (and the
            // forgot-password test helper) must know the mail was not recorded.
            return { success: false }
        }
    }

    // Production provider (Resend via standard HTTPS fetch, zero dependencies)
    try {
        const apiKey = process.env.RESEND_API_KEY
        const from = process.env.EMAIL_FROM || "AspirantBook <no-reply@aspirantbook.com>"
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from,
                to,
                subject,
                html,
                text,
            }),
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error("[Email] Resend API error:", errText)
            return { success: false }
        }

        const data = await res.json()
        return { success: true, id: data.id }
    } catch (err) {
        console.error("[Email] Send failed:", err)
        return { success: false }
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
