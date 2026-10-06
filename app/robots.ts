import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aspirantbook.com"
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/admin/", "/teacher/"],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    }
}
