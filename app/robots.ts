import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aspirantbook.com"
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/",
                "/admin/",
                "/teacher/",
                "/dashboard/",
                "/checkout/",
                "/login",
                "/register",
                "/forgot-password",
                "/reset-password",
                "/verify-email",
                "/settings/",
                "/current-affairs-quizzes/*/instructions",
                "/test-series/*/instructions",
                "/test-series/*/declaration",
                "/test-series/*/attempt",
                "/test-series/*/result",
                "/test-series/*/solutions",
            ],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    }
}
