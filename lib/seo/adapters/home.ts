import { buildSeoPackage, getBaseUrl } from "../core"
import type { SharedSeoOutput } from "../types"

/**
 * Homepage SEO. Canonical is "/" and the title is emitted absolute so the root
 * layout template does not append "| AspirantBook" a second time.
 */
export function adaptHomeSeo(baseUrl?: string): SharedSeoOutput {
  const base = getBaseUrl(baseUrl)
  const canonicalPath = "/"
  const title = "AspirantBook: BPSC & UPSC PYQs, Test Series & Video Courses"
  const description =
    "Prepare for BPSC and UPSC with Bihar-focused previous year papers (PYQs), online test series, video courses and expert study material on AspirantBook."

  return buildSeoPackage(
    {
      title,
      description,
      canonicalPath,
      titleAbsolute: true,
      isPublished: true,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: base ? `${base}/aspirant-logo.jpg` : "/aspirant-logo.jpg",
            width: 1200,
            height: 630,
            alt: "AspirantBook",
          },
        ],
      },
    },
    baseUrl
  )
}
