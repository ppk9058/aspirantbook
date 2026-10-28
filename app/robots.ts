import { MetadataRoute } from "next"
import { getBaseUrl } from "@/lib/seo/core"

export default function robots(): MetadataRoute.Robots {
    const siteUrl = getBaseUrl()
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
        sitemap: siteUrl
            ? [
                  `${siteUrl}/sitemap.xml`,
                  `${siteUrl}/question-answer/sitemap.xml`,
                  `${siteUrl}/hi/question-answer/sitemap.xml`,
              ]
            : undefined,
    }
}
