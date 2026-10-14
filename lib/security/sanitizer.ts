/**
 * Input sanitization and XSS prevention utilities.
 * Strips executable script tags, event handlers, and dangerous URIs.
 */

export function sanitizeHtml(raw: string): string {
    if (!raw || typeof raw !== "string") return ""

    let cleaned = raw
        // Remove script, iframe, object, embed, applet, form, style
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
        // Strip event handler attributes (onload, onerror, onclick, onmouseover, etc.)
        .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
        // Neutralize javascript: pseudo-protocol URIs
        .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"')
        .replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""')
        .replace(/data:\s*text\/html/gi, "data:text/plain")

    return cleaned
}

export function escapeHtml(raw: string): string {
    if (!raw || typeof raw !== "string") return ""
    return raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}
