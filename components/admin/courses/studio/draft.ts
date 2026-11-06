/**
 * Pure helpers for the Course Studio "Hero & Details" tab.
 *
 * The studio keeps a flat, string-based draft so every input is a controlled text
 * field. These functions convert between that draft and the persisted metadata
 * object, and never drop unknown keys (the caller spreads `...existingMeta`).
 */

export interface HeroMetricDraft {
  value: string
  valueHi: string
  label: string
  labelHi: string
}

export interface BilingualDraft {
  en: string
  hi: string
}

export interface BadgeDraft {
  label: string
  labelHi: string
  variant: "outlined" | "filled"
}

export interface HeroDraft {
  titleHi: string
  subtitle: string
  subtitleHi: string
  descriptionHi: string
  language: string
  category: string
  firstClassDate: string
  scheduleText: string
  scheduleTextHi: string
  validityText: string
  validityTextHi: string
  validityNote: string
  validityNoteHi: string
  enrollDisclaimer: string
  enrollDisclaimerHi: string
  lateJoinerTemplate: string
  lateJoinerTemplateHi: string
  thumbnailBadge: string
  thumbnailBadgeHi: string
  pillTags: string
  pillTagsHi: string
  goalLabel: string
  goalLabelHi: string
  enrollCtaLabel: string
  enrollCtaLabelHi: string
  enrollHelperText: string
  enrollHelperTextHi: string
  heroBackground: string
  hideIllustration: boolean
  badges: BadgeDraft[]
  heroMetrics: HeroMetricDraft[]
  howItWorks: BilingualDraft[]
  whatYouGet: BilingualDraft[]
}

export const MAX_HERO_METRICS = 4
export const MAX_PILL_TAGS = 8
export const MAX_BILINGUAL_ITEMS = 12
export const MAX_BADGES = 6

const text = (value: unknown): string => (typeof value === "string" ? value : "")

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_PILL_TAGS)
}

function joinTags(value: unknown): string {
  return Array.isArray(value) ? value.filter((tag) => typeof tag === "string").join(", ") : ""
}

function toBilingualList(value: unknown): BilingualDraft[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_BILINGUAL_ITEMS).map((item: any) => ({
    en: text(item?.en ?? item),
    hi: text(item?.hi),
  }))
}

function toBadgesList(value: unknown): BadgeDraft[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_BADGES).map((item: any) => ({
    label: text(item?.label ?? item),
    labelHi: text(item?.labelHi),
    variant: item?.variant === "outlined" ? "outlined" : "filled",
  }))
}

export function buildHeroDraft(meta: any, course?: any): HeroDraft {
  const pillTagsEn = joinTags(meta?.pillTags)
  const pillTagsHi = joinTags(meta?.pillTagsHi)

  const rawBadges = Array.isArray(meta?.badges)
    ? toBadgesList(meta.badges)
    : splitTags(pillTagsEn).map((t, idx) => ({
        label: t,
        labelHi: splitTags(pillTagsHi)[idx] || "",
        variant: (idx === 0 ? "outlined" : "filled") as "outlined" | "filled",
      }))

  return {
    titleHi: text(course?.titleHi ?? meta?.titleHi),
    subtitle: text(course?.subtitle ?? meta?.subtitle),
    subtitleHi: text(course?.subtitleHi ?? meta?.subtitleHi),
    descriptionHi: text(course?.descriptionHi ?? meta?.descriptionHi),
    language: text(meta?.language),
    category: text(course?.technology ?? meta?.classTag),
    firstClassDate: text(meta?.firstClassDate),
    scheduleText: text(meta?.scheduleText),
    scheduleTextHi: text(meta?.scheduleTextHi),
    validityText: text(meta?.validityText),
    validityTextHi: text(meta?.validityTextHi),
    validityNote: text(meta?.validityNote),
    validityNoteHi: text(meta?.validityNoteHi),
    enrollDisclaimer: text(meta?.enrollDisclaimer),
    enrollDisclaimerHi: text(meta?.enrollDisclaimerHi),
    lateJoinerTemplate: text(meta?.lateJoinerTemplate),
    lateJoinerTemplateHi: text(meta?.lateJoinerTemplateHi),
    thumbnailBadge: text(meta?.thumbnailBadge),
    thumbnailBadgeHi: text(meta?.thumbnailBadgeHi),
    pillTags: pillTagsEn,
    pillTagsHi: pillTagsHi,
    goalLabel: text(course?.goalLabel ?? meta?.goalLabel ?? meta?.targetText),
    goalLabelHi: text(course?.goalLabelHi ?? meta?.goalLabelHi),
    enrollCtaLabel: text(course?.enrollCtaLabel ?? meta?.enrollCtaLabel),
    enrollCtaLabelHi: text(course?.enrollCtaLabelHi ?? meta?.enrollCtaLabelHi),
    enrollHelperText: text(course?.enrollHelperText ?? meta?.enrollHelperText),
    enrollHelperTextHi: text(course?.enrollHelperTextHi ?? meta?.enrollHelperTextHi),
    heroBackground: text(meta?.heroBackground),
    hideIllustration: Boolean(meta?.hideIllustration),
    badges: rawBadges,
    heroMetrics: Array.isArray(meta?.heroMetrics)
      ? meta.heroMetrics.slice(0, MAX_HERO_METRICS).map((metric: any) => ({
          value: text(metric?.value),
          valueHi: text(metric?.valueHi),
          label: text(metric?.label),
          labelHi: text(metric?.labelHi),
        }))
      : [],
    howItWorks: toBilingualList(meta?.howItWorks),
    whatYouGet: toBilingualList(meta?.whatYouGet),
  }
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Converts the draft into the metadata fragment the studio saves.
 * Empty optional values become `null` so the public page falls back correctly.
 */
export function heroDraftToMetadata(draft: HeroDraft): Record<string, unknown> {
  return {
    subtitle: blankToNull(draft.subtitle),
    subtitleHi: blankToNull(draft.subtitleHi),
    language: blankToNull(draft.language),
    classTag: blankToNull(draft.category),
    firstClassDate: blankToNull(draft.firstClassDate),
    scheduleText: blankToNull(draft.scheduleText),
    scheduleTextHi: blankToNull(draft.scheduleTextHi),
    validityText: blankToNull(draft.validityText),
    validityTextHi: blankToNull(draft.validityTextHi),
    validityNote: blankToNull(draft.validityNote),
    validityNoteHi: blankToNull(draft.validityNoteHi),
    enrollDisclaimer: blankToNull(draft.enrollDisclaimer),
    enrollDisclaimerHi: blankToNull(draft.enrollDisclaimerHi),
    lateJoinerTemplate: blankToNull(draft.lateJoinerTemplate),
    lateJoinerTemplateHi: blankToNull(draft.lateJoinerTemplateHi),
    thumbnailBadge: blankToNull(draft.thumbnailBadge),
    thumbnailBadgeHi: blankToNull(draft.thumbnailBadgeHi),
    goalLabel: blankToNull(draft.goalLabel),
    goalLabelHi: blankToNull(draft.goalLabelHi),
    enrollCtaLabel: blankToNull(draft.enrollCtaLabel),
    enrollCtaLabelHi: blankToNull(draft.enrollCtaLabelHi),
    enrollHelperText: blankToNull(draft.enrollHelperText),
    enrollHelperTextHi: blankToNull(draft.enrollHelperTextHi),
    heroBackground: blankToNull(draft.heroBackground),
    hideIllustration: draft.hideIllustration,
    pillTags: splitTags(draft.pillTags),
    pillTagsHi: splitTags(draft.pillTagsHi),
    badges: draft.badges
      .filter((b) => b.label.trim())
      .slice(0, MAX_BADGES)
      .map((b) => ({
        label: b.label.trim(),
        labelHi: blankToNull(b.labelHi),
        variant: b.variant,
      })),
    heroMetrics: draft.heroMetrics
      .filter((metric) => metric.value.trim() && metric.label.trim())
      .slice(0, MAX_HERO_METRICS)
      .map((metric) => ({
        value: metric.value.trim(),
        valueHi: blankToNull(metric.valueHi),
        label: metric.label.trim(),
        labelHi: blankToNull(metric.labelHi),
      })),
    howItWorks: draft.howItWorks
      .filter((item) => item.en.trim())
      .slice(0, MAX_BILINGUAL_ITEMS)
      .map((item) => ({ en: item.en.trim(), hi: blankToNull(item.hi) })),
    whatYouGet: draft.whatYouGet
      .filter((item) => item.en.trim())
      .slice(0, MAX_BILINGUAL_ITEMS)
      .map((item) => ({ en: item.en.trim(), hi: blankToNull(item.hi) })),
  }
}

/** Course columns that mirror Hero fields (titleHi/subtitle/subtitleHi/descriptionHi). */
export function heroDraftToCourseColumns(draft: HeroDraft): Record<string, string | null> {
  return {
    titleHi: blankToNull(draft.titleHi),
    subtitle: blankToNull(draft.subtitle),
    subtitleHi: blankToNull(draft.subtitleHi),
    descriptionHi: blankToNull(draft.descriptionHi),
  }
}
