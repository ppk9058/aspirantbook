import DOMPurify from "dompurify"
import { sanitizeHtml as sanitizeHtmlFallback } from "@/lib/security/sanitizer"

/**
 * Safe inline formatting for tutorial content text.
 * Escapes raw HTML first to prevent XSS, then parses only safe markdown delimiters:
 * - **bold text** -> <strong>bold text</strong>
 * - ==highlight== -> <mark class="rz-mark">highlight</mark>
 * - `code` -> <code class="rz-code">code</code>
 */
export function inlineFmt(raw: unknown): string {
    const s = String(raw ?? "")
        .replace(/<mark class="hl-(?:yellow|blue|green)">([\s\S]*?)<\/mark>/gi, "==$1==")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    return s
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/==([^=]+)==/g, '<mark class="rz-mark">$1</mark>')
        .replace(/`([^`]+)`/g, '<code class="rz-code">$1</code>')
}

/**
 * Sanitize SVG strings allowing only safe SVG elements and filters
 */
export function sanitizeSvg(rawSvg: string): string {
    if (!rawSvg) return ""
    if (typeof window === "undefined") return rawSvg
    return DOMPurify.sanitize(rawSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
    })
}

/**
 * Sanitize HTML snippets using DOMPurify
 */
export function sanitizeHtml(rawHtml: string): string {
    if (!rawHtml) return ""
    if (typeof window === "undefined") return sanitizeHtmlFallback(rawHtml)
    return DOMPurify.sanitize(rawHtml)
}
