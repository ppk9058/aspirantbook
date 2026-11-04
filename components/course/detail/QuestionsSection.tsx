"use client"

import { useState } from "react"
import { ChevronDown, Star } from "lucide-react"
import { localized, type Lang } from "@/lib/i18n/localized"
import type { DetailFaq, RatingSummary } from "./types"
import { fontStackFor } from "./theme"

interface QuestionsSectionProps {
  lang: Lang
  faqs: DetailFaq[]
  ratingSummary?: RatingSummary | null
  courseTitle: string
}

export function QuestionsSection({
  lang,
  faqs = [],
  ratingSummary,
  courseTitle,
}: QuestionsSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx))
  }

  const defaultFaqs: DetailFaq[] = [
    {
      question: "Are classes live or recorded?",
      questionHi: "क्या कक्षाएं लाइव हैं या रिकॉर्डेड?",
      answer: "Classes are held live according to the course schedule, and full recordings are uploaded immediately after each class for unlimited access until the exam.",
      answerHi: "कक्षाएं कोर्स के शेड्यूल के अनुसार लाइव आयोजित की जाती हैं, और प्रत्येक कक्षा के तुरंत बाद पूरी रिकॉर्डिंग अपलोड कर दी जाती है ताकि आप परीक्षा तक असीमित बार देख सकें।",
    },
    {
      question: "Can I watch classes on mobile?",
      questionHi: "क्या मैं मोबाइल पर कक्षाएं देख सकता हूँ?",
      answer: "Yes, you can access all classes and handwritten notes seamlessly on mobile, tablet, and desktop web browsers as well as our official Android / iOS app.",
      answerHi: "हाँ, आप मोबाइल, टैबलेट और डेस्कटॉप वेब ब्राउज़र के साथ-साथ हमारे आधिकारिक ऐप पर सभी कक्षाओं और हस्तलिखित नोट्स को देख सकते हैं।",
    },
    {
      question: "How are doubts resolved?",
      questionHi: "संदेह कैसे दूर किए जाते हैं?",
      answer: "Dedicated doubt sessions are conducted weekly, and you can also ask questions during live classes and in the student discussion room.",
      answerHi: "साप्ताहिक रूप से समर्पित डाउट सत्र आयोजित किए जाते हैं, और आप लाइव कक्षाओं के दौरान और छात्र चर्चा कक्ष में भी प्रश्न पूछ सकते हैं।",
    },
  ]

  const effectiveFaqs = faqs.length > 0 ? faqs : defaultFaqs

  return (
    <section
      id="questions"
      aria-labelledby="questions-heading"
      className="scroll-mt-24 pt-8 pb-16"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      <h2
        id="questions-heading"
        className="text-3xl font-black tracking-tight text-[color:var(--cd-ink)] sm:text-4xl"
        style={{ fontFamily: "var(--cd-font-heading)" }}
        lang={lang}
      >
        {lang === "hi" ? "अक्सर पूछे जाने वाले सवाल" : "Frequently asked questions"}
      </h2>

      {/* Ratings if available */}
      {ratingSummary && ratingSummary.visible && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] p-5">
          <div className="flex items-center gap-2">
            <span
              className="text-3xl font-black text-[color:var(--cd-ink)]"
              style={{ fontFamily: "var(--cd-font-heading)" }}
            >
              {ratingSummary.average.toFixed(1)}
            </span>
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(ratingSummary.average) ? "fill-amber-400 text-amber-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-xs text-gray-600 font-semibold">
            Based on {ratingSummary.total} reviews for {courseTitle}
          </span>
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="mt-6 divide-y divide-[color:var(--cd-cream-dark)] rounded-2xl border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] overflow-hidden shadow-xs">
        {effectiveFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx
          const qText = lang === "hi" && faq.questionHi ? faq.questionHi : faq.question
          const aText = lang === "hi" && faq.answerHi ? faq.answerHi : faq.answer

          return (
            <div key={idx} className="transition-colors">
              <button
                type="button"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="flex min-h-[56px] w-full items-center justify-between gap-4 p-5 text-left hover:bg-white/50"
              >
                <span
                  className="text-sm font-black text-gray-950 sm:text-base leading-snug"
                  style={{ fontFamily: "var(--cd-font-heading)" }}
                  lang={lang}
                >
                  {qText}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-700 leading-relaxed border-t border-[color:var(--cd-cream-dark)]/50 bg-white/40">
                  <p lang={lang}>{aText}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
