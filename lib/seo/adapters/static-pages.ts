import { buildSeoPackage } from "../core"
import type { SharedSeoOutput } from "../types"

/**
 * Metadata for static informational pages. Every URL gets its own canonical;
 * the root layout intentionally does not set a global one.
 */
export function adaptStaticPageSeo(opts: {
  title: string
  description: string
  canonicalPath: string
  titleAbsolute?: boolean
  baseUrl?: string
}): SharedSeoOutput {
  return buildSeoPackage(
    {
      title: opts.title,
      description: opts.description,
      canonicalPath: opts.canonicalPath,
      titleAbsolute: opts.titleAbsolute,
      isPublished: true,
    },
    opts.baseUrl
  )
}
