/**
 * Maps course metadata (slug, title, or tags) to its corresponding platform Goal ID.
 */
export function getGoalForCourse(
    courseOrSlugOrTitle: string | { slug?: string | null; title?: string | null } | null | undefined
): string {
    if (!courseOrSlugOrTitle) return "skills"

    const slugStr = typeof courseOrSlugOrTitle === "object" && courseOrSlugOrTitle?.slug
        ? courseOrSlugOrTitle.slug.toLowerCase()
        : (typeof courseOrSlugOrTitle === "string" ? courseOrSlugOrTitle.toLowerCase() : "")

    // Check slug specific patterns first
    if (slugStr.includes("class-6") || slugStr.includes("half-yearly-6") || slugStr.includes("half-yearly-678")) {
        return "class-6"
    }
    if (slugStr.includes("class-7") || slugStr.includes("half-yearly-78") || slugStr.includes("half-yearly-7")) {
        return "class-7"
    }
    if (slugStr.includes("class-8") || slugStr.includes("half-yearly-8")) {
        return "class-8"
    }
    if (slugStr.includes("class-9")) {
        return "class-9"
    }
    if (slugStr.includes("class-10")) {
        return "class-10"
    }
    if (slugStr.includes("upsc")) {
        return "upsc"
    }
    if (slugStr.includes("bpsc")) {
        return "bpsc"
    }

    const titleStr = typeof courseOrSlugOrTitle === "object" && courseOrSlugOrTitle?.title
        ? courseOrSlugOrTitle.title.toLowerCase()
        : (typeof courseOrSlugOrTitle === "string" ? courseOrSlugOrTitle.toLowerCase() : "")

    const fullStr = `${slugStr} ${titleStr}`.toLowerCase()

    if (fullStr.includes("class 10") || fullStr.includes("10th")) {
        return "class-10"
    }
    if (fullStr.includes("class 9") || fullStr.includes("9th")) {
        return "class-9"
    }
    if (fullStr.includes("class 8") || fullStr.includes("8th")) {
        return "class-8"
    }
    if (fullStr.includes("class 7") || fullStr.includes("7th")) {
        return "class-7"
    }
    if (fullStr.includes("class 6") || fullStr.includes("6th") || fullStr.includes("half-yearly")) {
        return "class-6"
    }
    if (fullStr.includes("upsc")) {
        return "upsc"
    }
    if (fullStr.includes("bpsc")) {
        return "bpsc"
    }
    if (fullStr.includes("jee") || fullStr.includes("iit")) {
        return "jee"
    }
    if (fullStr.includes("neet")) {
        return "neet"
    }
    if (fullStr.includes("ssc")) {
        return "ssc"
    }
    if (fullStr.includes("banking") || fullStr.includes("bank")) {
        return "banking"
    }
    if (fullStr.includes("railway") || fullStr.includes("rrb")) {
        return "railways"
    }

    return "skills"
}
