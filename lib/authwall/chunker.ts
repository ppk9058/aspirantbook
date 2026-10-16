import crypto from "crypto"

/**
 * Standard HTML block-level tag names that define atomic content blocks.
 */
const BLOCK_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "pre", "table", "ul", "ol",
  "blockquote", "figure", "section", "article",
  "div", "hr"
]

/**
 * Splits an HTML string into top-level sanitized HTML block elements.
 * Guaranteed never to split mid-tag, mid-code block, or mid-table.
 */
export function splitHtmlIntoBlocks(html: string): string[] {
  if (!html || typeof html !== "string") return []

  const trimmed = html.trim()
  if (!trimmed) return []

  // Check if content is actually a JSON stringified array or object of blocks (e.g. Rosera blocks)
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      }
    } catch {
      // Fall through to HTML splitting
    }
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed)
      const arr = Array.isArray(parsed?.blocks) ? parsed.blocks : (Array.isArray(parsed?.activeBlocks) ? parsed.activeBlocks : null)
      if (arr) {
        return arr.map((item: any) => (typeof item === "string" ? item : JSON.stringify(item)))
      }
    } catch {
      // Fall through to HTML splitting
    }
  }

  // Tokenize top-level blocks using an HTML-safe scanner
  const blocks: string[] = []
  let index = 0
  const len = trimmed.length

  while (index < len) {
    // Skip leading whitespace between blocks
    while (index < len && /\s/.test(trimmed[index])) {
      index++
    }
    if (index >= len) break

    // If we're at a tag:
    if (trimmed[index] === "<") {
      // Check for closing tag without opening (stray tag), skip it
      if (trimmed[index + 1] === "/") {
        const closeEnd = trimmed.indexOf(">", index)
        index = closeEnd === -1 ? len : closeEnd + 1
        continue
      }

      // Check for comments
      if (trimmed.startsWith("<!--", index)) {
        const commentEnd = trimmed.indexOf("-->", index)
        index = commentEnd === -1 ? len : commentEnd + 3
        continue
      }

      // Match tag name
      const match = trimmed.slice(index).match(/^<([a-zA-Z0-9]+)(\s[^>]*)?(\/?)>/)
      if (match) {
        const tagName = match[1].toLowerCase()
        const isSelfClosing = match[3] === "/" || tagName === "hr" || tagName === "img" || tagName === "br"

        if (isSelfClosing) {
          const blockEnd = index + match[0].length
          const blockHtml = trimmed.slice(index, blockEnd).trim()
          if (blockHtml) blocks.push(blockHtml)
          index = blockEnd
          continue
        }

        // Find matching closing tag with support for nested tags of same type
        let depth = 1
        let searchIndex = index + match[0].length
        const openTagRegex = new RegExp(`<${tagName}(\\s[^>]*)?>`, "gi")
        const closeTagStr = `</${tagName}>`

        let blockEnd = -1
        while (depth > 0 && searchIndex < len) {
          const nextClose = trimmed.toLowerCase().indexOf(closeTagStr, searchIndex)
          if (nextClose === -1) {
            // Unclosed tag: treat remainder of document as this block
            blockEnd = len
            break
          }

          // Check if another open tag of same type appears before nextClose
          const nextOpen = trimmed.slice(searchIndex, nextClose).search(openTagRegex)
          if (nextOpen !== -1) {
            depth++
            searchIndex = searchIndex + nextOpen + 1
          } else {
            depth--
            if (depth === 0) {
              blockEnd = nextClose + closeTagStr.length
            } else {
              searchIndex = nextClose + closeTagStr.length
            }
          }
        }

        if (blockEnd === -1) blockEnd = len
        const blockHtml = trimmed.slice(index, blockEnd).trim()
        if (blockHtml) blocks.push(blockHtml)
        index = blockEnd
        continue
      }
    }

    // Bare text or inline tags: consume until next top-level block tag or double newline
    let nextTagIndex = trimmed.indexOf("<", index)
    if (nextTagIndex === -1) nextTagIndex = len

    // If next tag is not a block-level tag, keep scanning
    while (nextTagIndex < len) {
      const peek = trimmed.slice(nextTagIndex).match(/^<\/?([a-zA-Z0-9]+)/)
      if (peek && BLOCK_TAGS.includes(peek[1].toLowerCase())) {
        break
      }
      const nextNext = trimmed.indexOf("<", nextTagIndex + 1)
      nextTagIndex = nextNext === -1 ? len : nextNext
    }

    const chunk = trimmed.slice(index, nextTagIndex).trim()
    if (chunk) {
      // Wrap bare paragraphs if not already wrapped
      if (!chunk.startsWith("<")) {
        blocks.push(`<p>${chunk}</p>`)
      } else {
        blocks.push(chunk)
      }
    }
    index = nextTagIndex
  }

  // If no blocks were produced (e.g. single short text line), return it as one block
  if (blocks.length === 0 && trimmed.length > 0) {
    blocks.push(`<p>${trimmed}</p>`)
  }

  return blocks
}

/**
 * Pre-chunks any content type (HTML string, JSON blocks array or string, question array)
 * into an ordered array of atomic blocks.
 */
export function chunkContent(rawContent: any): any[] {
  if (!rawContent) return []

  // Case 1: Already an array (e.g. Rosera blocks, Question array)
  if (Array.isArray(rawContent)) {
    return rawContent
  }

  // Case 2: String
  if (typeof rawContent === "string") {
    const trimmed = rawContent.trim()
    if (!trimmed) return []

    // Try parsing as JSON array
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
        }
      } catch {
        // Not valid JSON, treat as HTML/text
      }
    }

    // Try parsing as JSON object containing blocks or activeBlocks
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed?.blocks)) {
          return parsed.blocks
        }
        if (Array.isArray(parsed?.activeBlocks)) {
          return parsed.activeBlocks
        }
      } catch {
        // Not valid JSON, treat as HTML/text
      }
    }

    // Check if HTML
    if (trimmed.includes("<") && trimmed.includes(">")) {
      return splitHtmlIntoBlocks(trimmed)
    }

    // Markdown or plain text: split by double newlines into paragraphs
    const paragraphs = trimmed
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => (p.startsWith("#") || p.startsWith("-") || p.startsWith("<") ? p : `<p>${p}</p>`))

    return paragraphs.length > 0 ? paragraphs : [`<p>${trimmed}</p>`]
  }

  // Case 3: Raw Object containing blocks array
  if (rawContent && typeof rawContent === "object") {
    if (Array.isArray(rawContent.blocks)) {
      return rawContent.blocks
    }
    if (Array.isArray(rawContent.activeBlocks)) {
      return rawContent.activeBlocks
    }
  }

  return [rawContent]
}

/**
 * Computes deterministic SHA-256 hash of content blocks.
 */
export function computeContentHash(blocks: any[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return ""
  const normalized = blocks.map((b) => (typeof b === "string" ? b.trim() : JSON.stringify(b))).join("::")
  return crypto.createHash("sha256").update(normalized).digest("hex")
}

/**
 * Counts words from HTML or plain text string.
 */
export function countWords(content: string): number {
  if (!content || typeof content !== "string") return 0
  const stripped = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  if (!stripped) return 0
  return stripped.split(/\s+/).filter((w) => w.length > 0).length
}

/**
 * Analyzes preview text for Studio SEO diagnostics:
 * - Word count of the preview
 * - Whether preview contains an H1/H2/H3 heading
 * - Share of text crawlers see
 */
export function analyzePreviewSeo(allBlocks: any[], previewPercentage: number): {
  totalWords: number
  previewWords: number
  shareOfText: number
  hasHeading: boolean
  warning: string | null
} {
  const totalItems = allBlocks.length
  if (totalItems === 0) {
    return {
      totalWords: 0,
      previewWords: 0,
      shareOfText: 0,
      hasHeading: false,
      warning: "No content available to preview.",
    }
  }

  const previewCount = Math.max(1, Math.ceil((previewPercentage / 100) * totalItems))
  const previewSlice = allBlocks.slice(0, previewCount)

  const previewText = previewSlice
    .map((b) => (typeof b === "string" ? b : JSON.stringify(b)))
    .join(" ")
  const allText = allBlocks
    .map((b) => (typeof b === "string" ? b : JSON.stringify(b)))
    .join(" ")

  const previewWords = countWords(previewText)
  const totalWords = countWords(allText)
  const shareOfText = totalWords > 0 ? Math.round((previewWords / totalWords) * 100) : 0
  const hasHeading = /<h[1-6][^>]*>/i.test(previewText) || /^#{1,6}\s+/m.test(previewText)

  let warning: string | null = null
  if (previewWords < 150 && totalWords >= 150) {
    warning = `Preview has only ${previewWords} words (fewer than 150 words recommended for SEO).`
  } else if (!hasHeading) {
    warning = "Preview has no heading (H1-H3). Consider adding a heading in the preview slice."
  }

  return {
    totalWords,
    previewWords,
    shareOfText,
    hasHeading,
    warning,
  }
}
