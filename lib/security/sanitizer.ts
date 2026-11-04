/**
 * Input sanitization and XSS prevention utilities.
 * Strips executable script tags, event handlers, and dangerous URIs.
 *
 * This is a defence-in-depth regex sanitizer used on both write and render
 * paths. It intentionally over-removes rather than under-removes.
 */

const DANGEROUS_TAGS = ["script", "iframe", "object", "embed", "applet", "form", "style", "meta", "link", "base"]

export function sanitizeHtml(raw: string): string {
    if (!raw || typeof raw !== "string") return ""

    let cleaned = raw

    // Remove paired dangerous elements, including unterminated ones.
    for (const tag of DANGEROUS_TAGS) {
        const paired = new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?(<\\s*\\/\\s*${tag}\\s*>|$)`, "gi")
        cleaned = cleaned.replace(paired, "")
        const stray = new RegExp(`<\\s*\\/?\\s*${tag}\\b[^>]*>`, "gi")
        cleaned = cleaned.replace(stray, "")
    }

    // Strip event handler attributes (quoted, single-quoted and unquoted).
    // The leading character class must include `/` so `<svg/onload=…>` is caught.
    cleaned = cleaned.replace(/(^|[\s"'`/])on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "$1")

    // Neutralise script pseudo-protocols anywhere (defeats entity/space tricks).
    cleaned = cleaned.replace(/javascript\s*:/gi, "")
    cleaned = cleaned.replace(/vbscript\s*:/gi, "")
    cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, "data:text/plain")

    // Numeric/named HTML entities can hide a scheme from the regex above
    // (e.g. `java&#115;cript:`). Decode a copy for detection; if it reveals an
    // executable scheme, drop every URI-bearing attribute.
    const decodedForCheck = cleaned
        .replace(/&#x([0-9a-f]+);?/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#([0-9]+);?/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&colon;/gi, ":")
        .replace(/&tab;/gi, "\t")
        .replace(/&newline;/gi, "\n")
    if (/(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i.test(decodedForCheck)) {
        cleaned = cleaned.replace(
            /\s(href|src|action|formaction|xlink:href|srcset|poster|data)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
        )
    }

    // Collapse the resulting empty URI attributes.
    cleaned = cleaned.replace(/\s(href|src|action|formaction|xlink:href)\s*=\s*(?:"\s*"|'\s*'|)\s*/gi, " ")

    // CSS expression() can execute script in legacy engines.
    cleaned = cleaned.replace(/expression\s*\(/gi, "blocked(")
    cleaned = cleaned.replace(/url\s*\(\s*['"]?\s*javascript\s*:/gi, "url(blocked:")

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
