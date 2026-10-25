/**
 * Bilingual pairing and 3-way language switch logic
 * Source: Exam_Content_Engine-4.html
 */

import { isHindiText } from "./cross-ref"

export type LanguageMode = "en" | "hi" | "both"

export interface LanguagePairQuestion {
  id: number | string
  q: string
  o: string[]
  ans?: string
  a: number
  exp?: string
  sub?: string
  top?: string
  exam?: string
  year?: string
  // Translations
  translation?: {
    q: string
    o: string[]
    exp?: string
    top?: string
    isReviewed?: boolean
  } | null
}

export interface PairedQuestionView {
  sourceLanguage: "hi" | "en"
  primary: {
    q: string
    o: string[]
    exp: string
    top: string
  }
  paired: {
    q: string
    o: string[]
    exp: string
    top: string
    isReviewed: boolean
    isAvailable: boolean
  }
  hasTranslation: boolean
  missingExpInPaired: boolean
}

export function buildPairedQuestionView(item: LanguagePairQuestion): PairedQuestionView {
  const isHiSource = isHindiText(item.q)
  const sourceLang: "hi" | "en" = isHiSource ? "hi" : "en"

  const primary = {
    q: item.q,
    o: item.o,
    exp: item.exp || "",
    top: item.top || "",
  }

  const tr = item.translation
  const hasTr = Boolean(
    tr &&
      tr.q &&
      Array.isArray(tr.o) &&
      tr.o.length === item.o.length
  )

  const paired = {
    q: hasTr ? tr!.q : "",
    o: hasTr ? tr!.o : [],
    exp: hasTr ? tr!.exp || "" : "",
    top: hasTr ? tr!.top || item.top || "" : "",
    isReviewed: Boolean(tr?.isReviewed),
    isAvailable: hasTr,
  }

  const missingExpInPaired = Boolean(
    item.exp && item.exp.trim() && hasTr && (!paired.exp || !paired.exp.trim())
  )

  return {
    sourceLanguage: sourceLang,
    primary,
    paired,
    hasTranslation: hasTr,
    missingExpInPaired,
  }
}

/**
 * Returns user-facing status messages for missing translations without any AI or Translate buttons.
 */
export function getMissingTranslationNote(targetLang: "hi" | "en"): string {
  return targetLang === "hi"
    ? "हिन्दी अनुवाद अभी उपलब्ध नहीं है।"
    : "English translation is not available yet."
}

export function getMissingExplanationNote(targetLang: "hi" | "en"): string {
  return targetLang === "hi"
    ? "हिन्दी व्याख्या उपलब्ध नहीं है।"
    : "English explanation is not available yet."
}
