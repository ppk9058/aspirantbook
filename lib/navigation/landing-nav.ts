export interface LandingNavItem {
    name: string
    href: string
    badge?: string
    isExternalOrAnchor?: boolean
}

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
    {
        name: "Courses",
        href: "/courses",
    },
    {
        name: "Test Series",
        href: "/test-series",
    },
    {
        name: "Learn",
        href: "/tutorials",
    },
    {
        name: "School Prep",
        href: "#all-courses-container",
        isExternalOrAnchor: true,
    },
    {
        name: "UPSC",
        href: "#section-upsc",
        isExternalOrAnchor: true,
    },
    {
        name: "BPSC",
        href: "#section-bpsc",
        isExternalOrAnchor: true,
    },
]
