/**
 * Build URLs for global search results.
 * Each content type has its own route pattern.
 */

export type SearchResultGroup = "testSeries" | "course" | "tutorial"

export interface SearchItem {
    id: string
    slug?: string | null
    title: string
}

export function buildResultUrl(
    group: SearchResultGroup,
    item: SearchItem
): string {
    const identifier = item.slug || item.id
    
    switch (group) {
        case "testSeries":
            return `/test-series/${identifier}`
        case "course":
            return `/courses/${identifier}`
        case "tutorial":
            return `/tutorials/${identifier}`
        default:
            throw new Error(`Unknown search result group: ${group}`)
    }
}
