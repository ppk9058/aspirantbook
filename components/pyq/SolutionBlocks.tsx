import Link from "next/link"
import { KeyRound, FileText, Lightbulb } from "lucide-react"
import { inlineHtml, publicSolution, escapeHtml } from "@/lib/pyq/render"

/**
 * Colorful structured-solution renderer (Phase 2, M6). Server-renderable.
 * All text is escaped; only **bold** passes through (lib/pyq/render.ts).
 * Private review fields (CHECK_NOTE, UNSURE, warnings) are stripped by
 * publicSolution() and never rendered here.
 *
 * Option analysis format (user requirement): every option shows the because
 * part — "Option (A) — Correct because ..." / "Incorrect because ...".
 */

function SectionHeading({
  icon,
  title,
  tone,
}: {
  icon: React.ReactNode
  title: string
  tone: "emerald" | "sky" | "purple"
}) {
  const tones = {
    emerald:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    sky: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
    purple:
      "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  } as const
  return (
    <h3 className="flex items-center gap-2 text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tones[tone]}`}
      >
        {icon}
      </span>
      <span className="underline decoration-2 underline-offset-4 decoration-current/40">
        {title}
      </span>
    </h3>
  )
}

export function SolutionBlocks({
  solution,
  answerLetter,
  answerText,
  basePath = "/question-answer",
  topicFilterKey = "topic",
}: {
  solution: unknown
  answerLetter?: string | null
  answerText?: string | null
  basePath?: string
  topicFilterKey?: string
}) {
  const sol = publicSolution(solution)
  const keyPoints = sol.keyPoints ?? []
  const additionalInfo = sol.additionalInfo ?? []
  const concepts = sol.concepts ?? []
  const optionAnalysis = sol.optionAnalysis ?? []
  const hasAny =
    sol.answerExplain ||
    keyPoints.length > 0 ||
    additionalInfo.length > 0 ||
    optionAnalysis.length > 0 ||
    sol.memoryTip ||
    concepts.length > 0

  if (!hasAny) return null

  return (
    <section aria-label="Detailed solution" className="space-y-6">
      {/* Correct answer banner (indigo) */}
      {answerText && (
        <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200">
          The correct answer is the{" "}
          <strong className="text-indigo-700 dark:text-indigo-300">
            option {escapeHtml(answerLetter || answerText)}
          </strong>
          .
        </p>
      )}
      {sol.answerExplain && (
        <p
          className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-3 sm:p-4"
          dangerouslySetInnerHTML={{ __html: inlineHtml(sol.answerExplain) }}
        />
      )}

      {/* Key Points (emerald) */}
      {keyPoints.length > 0 && (
        <div className="space-y-3">
          <SectionHeading
            tone="emerald"
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            title="Key Points"
          />
          <ul className="space-y-1.5">
            {keyPoints.map((kp, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm sm:text-[15px] leading-relaxed text-gray-800 dark:text-gray-200"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                  aria-hidden="true"
                />
                <span dangerouslySetInnerHTML={{ __html: inlineHtml(kp) }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Additional Information (sky) */}
      {additionalInfo.length > 0 && (
        <div className="space-y-3">
          <SectionHeading
            tone="sky"
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            title="Additional Information"
          />
          <div className="space-y-3">
            {additionalInfo.map((section, i) => (
              <div key={i}>
                {section.heading && (
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    <span
                      aria-hidden="true"
                      className="mr-1.5 text-sky-600 dark:text-sky-400"
                    >
                      •
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: inlineHtml(section.heading),
                      }}
                    />
                  </p>
                )}
                <ul className="mt-1 space-y-1 sm:pl-5">
                  {section.points.map((p, j) => (
                    <li key={j} className="text-sm sm:text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">
                      <span
                        className="mr-1.5 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                      >
                        ◦
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: inlineHtml(p.text) }} />
                      {p.sub?.map((s, k) => (
                        <span key={k}>
                          <br />
                          <span className="sm:pl-4 inline-block" dangerouslySetInnerHTML={{ __html: inlineHtml(s) }} />
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Option Analysis (green/red) — always includes the because part */}
      {optionAnalysis.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
            Option Analysis
          </h3>
          <ul className="space-y-1.5">
            {optionAnalysis.map((o, i) => {
              const correct = /^correct$/i.test(o.verdict || "")
              return (
                <li
                  key={i}
                  className={`rounded-xl border p-2.5 sm:p-3 text-sm sm:text-[15px] leading-relaxed ${
                    correct
                      ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-100"
                      : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/25 text-red-900 dark:text-red-100"
                  }`}
                >
                  <strong>
                    Option ({escapeHtml(o.letter)})
                  </strong>{" "}
                  —{" "}
                  <strong
                    className={
                      correct
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }
                  >
                    {correct ? "Correct" : "Incorrect"}
                  </strong>{" "}
                  because{" "}
                  <span dangerouslySetInnerHTML={{ __html: inlineHtml(o.reason) }} />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Memory Tip (amber) */}
      {sol.memoryTip && (
        <div className="flex gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/25 p-3 sm:p-4">
          <Lightbulb
            className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm sm:text-[15px] leading-relaxed text-amber-900 dark:text-amber-100">
            <span dangerouslySetInnerHTML={{ __html: inlineHtml(sol.memoryTip) }} />
          </p>
        </div>
      )}

      {/* See-also concept chips (purple) — link to topic-filtered hub */}
      {concepts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Also revise
          </h3>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <Link
                key={c}
                href={`${basePath}?${topicFilterKey}=${encodeURIComponent(c)}`}
                className="inline-flex items-center min-h-[36px] rounded-full border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 px-3 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                {escapeHtml(c)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
