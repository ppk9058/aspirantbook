"use client"

import { Field, Select, StudioSection, TextArea, TextInput } from "./fields"
import { COURSE_LANGUAGES } from "@/lib/courses/languages"
import { EXAM_CATEGORIES } from "@/lib/courses/categories"
import type { BilingualDraft, HeroDraft, HeroMetricDraft } from "./draft"
import { MAX_BILINGUAL_ITEMS, MAX_HERO_METRICS } from "./draft"

interface HeroDetailsTabProps {
  draft: HeroDraft
  onChange: (patch: Partial<HeroDraft>) => void
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
}

/**
 * "Hero & Details" tab: every field the course detail hero/about block renders,
 * with the Hindi twin beside it. All values are plain text (no HTML).
 */
export function HeroDetailsTab({
  draft,
  onChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
}: HeroDetailsTabProps) {
  const setMetric = (index: number, patch: Partial<HeroMetricDraft>) => {
    const next = draft.heroMetrics.map((metric, i) => (i === index ? { ...metric, ...patch } : metric))
    onChange({ heroMetrics: next })
  }

  const addMetric = () => {
    if (draft.heroMetrics.length >= MAX_HERO_METRICS) return
    onChange({ heroMetrics: [...draft.heroMetrics, { value: "", valueHi: "", label: "", labelHi: "" }] })
  }

  const removeMetric = (index: number) =>
    onChange({ heroMetrics: draft.heroMetrics.filter((_, i) => i !== index) })

  const setListItem = (
    key: "howItWorks" | "whatYouGet",
    index: number,
    patch: Partial<BilingualDraft>
  ) => {
    const next = draft[key].map((item, i) => (i === index ? { ...item, ...patch } : item))
    onChange({ [key]: next } as Partial<HeroDraft>)
  }

  const addListItem = (key: "howItWorks" | "whatYouGet") => {
    if (draft[key].length >= MAX_BILINGUAL_ITEMS) return
    onChange({ [key]: [...draft[key], { en: "", hi: "" }] } as Partial<HeroDraft>)
  }

  const removeListItem = (key: "howItWorks" | "whatYouGet", index: number) => {
    onChange({ [key]: draft[key].filter((_, i) => i !== index) } as Partial<HeroDraft>)
  }

  const categoryOptions = EXAM_CATEGORIES.map((category) => ({ value: category.value, label: category.label }))
  const knownCategory = categoryOptions.some((option) => option.value === draft.category)
  if (draft.category && !knownCategory) {
    categoryOptions.push({ value: draft.category, label: `${draft.category} (custom)` })
  }

  return (
    <div className="space-y-4">
      <StudioSection
        title="Title & description"
        description="Hindi is optional per field — an empty Hindi field falls back to English on the public page."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title (English)" htmlFor="hero-title" required>
            <TextInput id="hero-title" value={title} onChange={onTitleChange} maxLength={200} />
          </Field>
          <Field label="Title (Hindi)" htmlFor="hero-title-hi">
            <TextInput id="hero-title-hi" value={draft.titleHi} onChange={(v) => onChange({ titleHi: v })} maxLength={200} lang="hi" />
          </Field>
          <Field label="Subtitle (English)" htmlFor="hero-subtitle">
            <TextInput id="hero-subtitle" value={draft.subtitle} onChange={(v) => onChange({ subtitle: v })} maxLength={240} />
          </Field>
          <Field label="Subtitle (Hindi)" htmlFor="hero-subtitle-hi">
            <TextInput id="hero-subtitle-hi" value={draft.subtitleHi} onChange={(v) => onChange({ subtitleHi: v })} maxLength={240} lang="hi" />
          </Field>
        </div>

        <div className="mt-3 grid gap-3">
          <Field label="Description (English)" htmlFor="hero-description">
            <TextArea id="hero-description" value={description} onChange={onDescriptionChange} rows={4} maxLength={4000} />
          </Field>
          <Field label="Description (Hindi)" htmlFor="hero-description-hi">
            <TextArea
              id="hero-description-hi"
              value={draft.descriptionHi}
              onChange={(v) => onChange({ descriptionHi: v })}
              rows={4}
              maxLength={4000}
              lang="hi"
            />
          </Field>
        </div>
      </StudioSection>

      <StudioSection title="Exam & language" description="Used by the hero metrics, filters and the About block.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exam / category" htmlFor="hero-category">
            <Select id="hero-category" value={draft.category} onChange={(v) => onChange({ category: v })} options={categoryOptions} placeholder="Select an exam" />
          </Field>
          <Field label="Delivery language" htmlFor="hero-language">
            <Select
              id="hero-language"
              value={draft.language}
              onChange={(v) => onChange({ language: v })}
              options={COURSE_LANGUAGES.map((language) => ({ value: language.value, label: language.label }))}
              placeholder="Use course default"
            />
          </Field>
          <Field label="First class date" htmlFor="hero-first-class" hint="Free text or ISO date, e.g. 2026-11-02">
            <TextInput id="hero-first-class" value={draft.firstClassDate} onChange={(v) => onChange({ firstClassDate: v })} maxLength={40} />
          </Field>
          <Field label="Thumbnail badge (English)" htmlFor="hero-badge">
            <TextInput id="hero-badge" value={draft.thumbnailBadge} onChange={(v) => onChange({ thumbnailBadge: v })} maxLength={40} />
          </Field>
          <Field label="Thumbnail badge (Hindi)" htmlFor="hero-badge-hi">
            <TextInput id="hero-badge-hi" value={draft.thumbnailBadgeHi} onChange={(v) => onChange({ thumbnailBadgeHi: v })} maxLength={40} lang="hi" />
          </Field>
        </div>
      </StudioSection>

      <StudioSection
        title="Hero metrics"
        description="Up to 4. Left empty, the page derives lectures / hours / language / last class from real data."
        actions={
          <button
            type="button"
            onClick={addMetric}
            disabled={draft.heroMetrics.length >= MAX_HERO_METRICS}
            className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 disabled:opacity-50"
          >
            + Add metric
          </button>
        }
      >
        {draft.heroMetrics.length === 0 ? (
          <p className="text-xs text-gray-500">No custom metrics — derived values will be shown.</p>
        ) : (
          <ul className="space-y-3">
            {draft.heroMetrics.map((metric, index) => (
              <li key={index} className="rounded-xl border border-gray-200 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Value (English)">
                    <TextInput value={metric.value} onChange={(v) => setMetric(index, { value: v })} maxLength={40} />
                  </Field>
                  <Field label="Value (Hindi)">
                    <TextInput value={metric.valueHi} onChange={(v) => setMetric(index, { valueHi: v })} maxLength={40} lang="hi" />
                  </Field>
                  <Field label="Label (English)">
                    <TextInput value={metric.label} onChange={(v) => setMetric(index, { label: v })} maxLength={60} />
                  </Field>
                  <Field label="Label (Hindi)">
                    <TextInput value={metric.labelHi} onChange={(v) => setMetric(index, { labelHi: v })} maxLength={60} lang="hi" />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => removeMetric(index)}
                  className="mt-2 min-h-[36px] rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Remove metric
                </button>
              </li>
            ))}
          </ul>
        )}
      </StudioSection>

      <StudioSection title="Pill tags" description="Comma separated, up to 8. Shown above the hero title.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tags (English)" htmlFor="hero-tags">
            <TextInput id="hero-tags" value={draft.pillTags} onChange={(v) => onChange({ pillTags: v })} placeholder="UPSC, GS Foundation" />
          </Field>
          <Field label="Tags (Hindi)" htmlFor="hero-tags-hi">
            <TextInput id="hero-tags-hi" value={draft.pillTagsHi} onChange={(v) => onChange({ pillTagsHi: v })} placeholder="यूपीएससी, जीएस" lang="hi" />
          </Field>
        </div>
      </StudioSection>

      <StudioSection title="Schedule & validity" description="Shown in the sticky card and About block.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Schedule text (English)">
            <TextInput value={draft.scheduleText} onChange={(v) => onChange({ scheduleText: v })} maxLength={240} />
          </Field>
          <Field label="Schedule text (Hindi)">
            <TextInput value={draft.scheduleTextHi} onChange={(v) => onChange({ scheduleTextHi: v })} maxLength={240} lang="hi" />
          </Field>
          <Field label="Validity (English)">
            <TextInput value={draft.validityText} onChange={(v) => onChange({ validityText: v })} maxLength={240} />
          </Field>
          <Field label="Validity (Hindi)">
            <TextInput value={draft.validityTextHi} onChange={(v) => onChange({ validityTextHi: v })} maxLength={240} lang="hi" />
          </Field>
          <Field label="Validity note (English)">
            <TextInput value={draft.validityNote} onChange={(v) => onChange({ validityNote: v })} maxLength={240} />
          </Field>
          <Field label="Validity note (Hindi)">
            <TextInput value={draft.validityNoteHi} onChange={(v) => onChange({ validityNoteHi: v })} maxLength={240} lang="hi" />
          </Field>
          <Field label="Enrol disclaimer (English)">
            <TextInput value={draft.enrollDisclaimer} onChange={(v) => onChange({ enrollDisclaimer: v })} maxLength={240} />
          </Field>
          <Field label="Enrol disclaimer (Hindi)">
            <TextInput value={draft.enrollDisclaimerHi} onChange={(v) => onChange({ enrollDisclaimerHi: v })} maxLength={240} lang="hi" />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Late-joiner note (English)" hint="Use {n} for the lecture count. Blank hides the note.">
            <TextInput value={draft.lateJoinerTemplate} onChange={(v) => onChange({ lateJoinerTemplate: v })} maxLength={240} />
          </Field>
          <Field label="Late-joiner note (Hindi)" hint="Uses the same {n} placeholder.">
            <TextInput value={draft.lateJoinerTemplateHi} onChange={(v) => onChange({ lateJoinerTemplateHi: v })} maxLength={240} lang="hi" />
          </Field>
        </div>
      </StudioSection>

      <BilingualList
        title="How it works"
        items={draft.howItWorks}
        onAdd={() => addListItem("howItWorks")}
        onRemove={(index) => removeListItem("howItWorks", index)}
        onChange={(index, patch) => setListItem("howItWorks", index, patch)}
      />

      <BilingualList
        title="What you get"
        items={draft.whatYouGet}
        onAdd={() => addListItem("whatYouGet")}
        onRemove={(index) => removeListItem("whatYouGet", index)}
        onChange={(index, patch) => setListItem("whatYouGet", index, patch)}
      />
    </div>
  )
}

function BilingualList({
  title,
  items,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string
  items: BilingualDraft[]
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, patch: Partial<BilingualDraft>) => void
}) {
  return (
    <StudioSection
      title={title}
      description="Plain text, one item per row."
      actions={
        <button
          type="button"
          onClick={onAdd}
          disabled={items.length >= MAX_BILINGUAL_ITEMS}
          className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 disabled:opacity-50"
        >
          + Add item
        </button>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">Nothing added yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="grid gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={`Item ${index + 1} (English)`}>
                <TextInput value={item.en} onChange={(v) => onChange(index, { en: v })} maxLength={240} />
              </Field>
              <Field label="Item (Hindi)">
                <TextInput value={item.hi} onChange={(v) => onChange(index, { hi: v })} maxLength={240} lang="hi" />
              </Field>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="min-h-[44px] rounded-lg px-3 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </StudioSection>
  )
}
