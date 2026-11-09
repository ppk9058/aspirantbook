import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function cleanDescriptionSnippet(raw?: string | null, maxLength: number = 160): string {
    if (!raw) return "Interactive course with rich modules and exercises."
    let cleaned = raw.replace(/!\[.*?\]\([^)]+\)/g, "")
    cleaned = cleaned.replace(/data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+/g, "")
    cleaned = cleaned.replace(/<[^>]+>/g, "")
    cleaned = cleaned.replace(/\[\/?(badge|highlight|callout|NOTE|TIP|WARNING|IMPORTANT)[^\]]*\]/gi, "")
    cleaned = cleaned.replace(/\[!.*?\]/g, "")
    cleaned = cleaned.replace(/^#+.*$/gm, "")
    cleaned = cleaned.replace(/- \[[ x]\]/gi, "")
    cleaned = cleaned.replace(/==([^=]+)==/g, "$1")
    cleaned = cleaned.replace(/==+/g, "")
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1")
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1")
    cleaned = cleaned.replace(/[#*`_~>|]/g, "")
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    cleaned = cleaned.replace(/\s+/g, " ").trim()
    if (!cleaned) return "Interactive course with rich modules and exercises."
    return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + "..." : cleaned
}

export function formatDate(date?: string | Date | number | null): string {
    if (!date) return ""
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const day = d.getUTCDate()
    const month = months[d.getUTCMonth()]
    const year = d.getUTCFullYear()
    return `${day} ${month} ${year}`
}

export function pluralize(count: number, singular: string, plural?: string): string {
    const p = plural || `${singular}s`
    return `${count} ${count === 1 ? singular : p}`
}

export function formatCount(count: number | string, singular: string, plural?: string): string {
    const num = typeof count === "string" ? parseInt(count, 10) : count
    if (isNaN(num)) return `${count} ${plural || `${singular}s`}`
    const p = plural || `${singular}s`
    return `${count} ${num === 1 ? singular : p}`
}
export function safeParseJson<T = any>(val: any): T | null {
    if (!val) return null
    if (typeof val === "object") return val
    try {
        return JSON.parse(val)
    } catch {
        return null
    }
}
