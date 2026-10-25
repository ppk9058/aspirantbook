/**
 * Rich Solution Formatter and Option Analysis
 * Source: Exam_Content_Engine-4.html
 */

import { matchParse } from "./parser"
import { isHindiText } from "./cross-ref"

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)
  )

export const isNum = (t: string): boolean => /^[\d\s]+$/.test(t || "")

/**
 * Splits text into sentences, honoring Latin punctuation and Devanagari Danda (।).
 */
export function sents(t: string): string[] {
  if (!t) return []
  if (/[\u0900-\u097F]/.test(t)) {
    return t
      .replace(/\s+/g, " ")
      .split(/(?<=[।.!?])\s+/)
      .filter(Boolean)
  }
  const o: string[] = []
  t.replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .forEach((x) => {
      const l = o[o.length - 1]
      if (l && (l.length < 25 || /(?:\b[A-Z]|\bDr|\bMr|\bSt|\bvs)\.$/.test(l))) {
        o[o.length - 1] = l + " " + x
      } else {
        o.push(x)
      }
    })
  return o
}

const SK =
  "The|This|These|That|In|It|He|She|His|Her|Under|Since|Although|Whereas|However|But|And|Also|Along|There|Some|Many|Most|During|As|On|At|By|For|From|With"

/**
 * Highlights key terms, years, and answer phrases in an explanation sentence.
 */
export function hl(s: string, ans?: string): string {
  const a = ans && ans.length > 2 && !isNum(ans) ? ans.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|" : ""
  const re = new RegExp(
    `(?:${a}\\b(?:1[0-9]{3}|20\\d\\d)\\b|(?!(?:${SK})\\b)[A-Z][a-z]+(?:\\s[A-Z][a-z]+){1,3})`,
    "g"
  )
  let o = ""
  let l = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    o += esc(s.slice(l, m.index)) + "<b>" + esc(m[0]) + "</b>"
    l = m.index + m[0].length
  }
  return o + esc(s.slice(l))
}

const H_TAG = (t: string, ic: string, col: string) =>
  `<div class="sh flex items-center gap-2.5 my-4"><i class="w-7 h-7 rounded-full flex items-center justify-center not-italic text-sm shrink-0" style="background:${col}33">${ic}</i><h3 class="m-0 text-base font-bold text-gray-900 dark:text-gray-100">${esc(t)}</h3></div>`

const ul = (a: string[]) => `<ul class="list-disc pl-5 my-2 space-y-1">${a.map((x) => `<li>${x}</li>`).join("")}</ul>`

const tbl = (rows: string[][]) =>
  `<table class="mt w-full border-collapse my-2 text-sm">` +
  rows
    .map(
      (r, k) =>
        "<tr>" +
        r
          .map((c) =>
            k
              ? `<td class="border border-gray-300 dark:border-gray-700 p-2 text-left">${hl(c)}</td>`
              : `<th class="border border-gray-300 dark:border-gray-700 p-2 text-left bg-gray-100 dark:bg-gray-800 font-semibold">${esc(c)}</th>`
          )
          .join("") +
        "</tr>"
    )
    .join("") +
  "</table>"

/**
 * Formats multi-line structured explanations (titles, bullets, markdown tables).
 */
export function rich(ex: string): string {
  const L = ex
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
  const col: Record<string, string> = { key: "#16a34a", imp: "#dc2626", add: "#2563eb" }
  const ic: Record<string, string> = { key: "🔑", imp: "📌", add: "ℹ️" }
  let h = ""
  let u: string[] = []
  let tb: string[][] = []

  const fl = () => {
    if (u.length) {
      h += ul(u)
      u = []
    }
    if (tb.length) {
      h += tbl(tb)
      tb = []
    }
  }

  L.forEach((l) => {
    let m: RegExpMatchArray | null
    if (/^[-•*]\s+/.test(l)) {
      if (tb.length) fl()
      u.push(hl(l.replace(/^[-•*]\s+/, "")))
    } else if (l.includes("|")) {
      if (u.length) fl()
      const r = l.split("|").map((x) => x.trim())
      if (r[0] === "") r.shift()
      if (r[r.length - 1] === "") r.pop()
      if (!r.every((x) => /^:?-{2,}:?$/.test(x))) {
        tb.push(r)
      }
    } else if ((m = l.match(/^(.{3,40}?)\s*:$/))) {
      fl()
      const k = /^key/i.test(m[1])
        ? "key"
        : /^important/i.test(m[1])
        ? "imp"
        : /^(additional|more|extra)/i.test(m[1])
        ? "add"
        : ""
      h += H_TAG(m[1], ic[k] || "▸", col[k] || "#7c3aed")
    } else {
      fl()
      h += `<p class="my-1.5 text-gray-800 dark:text-gray-200">${hl(l)}</p>`
    }
  })

  fl()
  return h
}

export function matchTbl(q: string, o: string[], a: number): string {
  const m = matchParse(q)
  if (!m || a < 0 || !isNum(o[a])) return ""
  const d = o[a].trim().split(/\s+/)
  const by: Record<string, string> = {}
  m.rows.forEach((r) => (by[r[2]] = r[3]))

  return (
    H_TAG("Correct Matching", "🧩", "#7c3aed") +
    `<table class="mt w-full border-collapse my-2 text-sm"><tr><th class="border border-gray-300 dark:border-gray-700 p-2 text-left bg-gray-100 dark:bg-gray-800">List-I</th><th class="border border-gray-300 dark:border-gray-700 p-2 text-left bg-gray-100 dark:bg-gray-800">Matched with (List-II)</th></tr>${m.rows
      .map(
        (r, k) =>
          `<tr><td class="border border-gray-300 dark:border-gray-700 p-2">${r[0]}. ${esc(r[1])}</td><td class="border border-gray-300 dark:border-gray-700 p-2">${d[k] || ""}. ${esc(by[d[k]] || "")}</td></tr>`
      )
      .join("")}</table>`
  )
}

const STOP_WORDS = new Set(
  "which following about their there these those would where when what with from that this have were been into than then also only both each other such given below above correct statement statements answer select using code".split(
    " "
  )
)

export function extractKeywords(t: string): Set<string> {
  const matches = (t.toLowerCase().match(/[a-z0-9\u0900-\u097F]{4,}/g) || []).filter(
    (w) => !STOP_WORDS.has(w)
  )
  return new Set(matches)
}

export interface FormatterQuestionInput {
  id: number | string
  q: string
  o: string[]
  ans?: string
  a: number
  exp?: string
  sub?: string
  top?: string
  type?: string
}

/**
 * Generates the full rich HTML solution for a question, including option analysis and related points.
 */
export function formatSolutionHtml(
  item: FormatterQuestionInput,
  pool: FormatterQuestionInput[] = [],
  borrowedRefNote?: string
): string {
  const isHi = isHindiText(item.q)
  const at = item.a > -1 && item.a < item.o.length ? item.o[item.a] : ""
  const optionLetters = "abcde"

  let h = `<div class="ds mt-2">`
  if (borrowedRefNote) {
    h += `<div class="p-2.5 my-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">${esc(borrowedRefNote)}</div>`
  }

  if (item.a > -1) {
    const ansPrefix = isHi ? "सही उत्तर है" : "The correct answer is"
    const optLabel = isHi ? "विकल्प" : "option"
    h += `<p class="ca text-base my-2 font-medium">${ansPrefix} <u class="font-bold">${esc(at)}</u> <span class="text-gray-500 text-sm">(${optLabel} ${optionLetters[item.a]})</span></p>`
  } else {
    h += `<p class="text-gray-500 my-2">${isHi ? "स्रोत में उत्तर नहीं मिला।" : "No answer found in the source text."}</p>`
  }

  const ex = (item.exp || "").trim()
  if (/\n/.test(ex) || /^(key|important) points/i.test(ex)) {
    h += rich(ex)
  } else {
    const sentences = ex ? sents(ex) : []
    const keyPointsTitle = isHi ? "मुख्य बिंदु" : "Key Points"
    const addInfoTitle = isHi ? "अतिरिक्त जानकारी" : "Additional Information"

    h += H_TAG(keyPointsTitle, "🔑", "#16a34a")
    h += `<p class="sb font-bold text-base my-1 text-gray-900 dark:text-gray-100">${esc(!at || isNum(at) ? item.top || "" : at)}</p>`
    h += sentences.length
      ? ul(sentences.slice(0, 4).map((x) => hl(x, at)))
      : ul([isHi ? "स्रोत में व्याख्या उपलब्ध नहीं है।" : "No explanation available in the source."])

    if (sentences.length > 4) {
      h += H_TAG(addInfoTitle, "ℹ️", "#2563eb")
      h += ul(sentences.slice(4).map((x) => hl(x, at)))
    }
  }

  h += matchTbl(item.q, item.o, item.a)

  // Option Analysis Table
  const optAnalysisTitle = isHi ? "विकल्प विश्लेषण" : "Option Analysis"
  const colOpt = isHi ? "विकल्प" : "Option"
  const colStmt = isHi ? "कथन" : "Statement"
  const colVerdict = isHi ? "निर्णय" : "Verdict"
  const correctLabel = isHi ? "✓ सही" : "✓ Correct"
  const incorrectLabel = isHi ? "✗ गलत" : "✗ Incorrect"

  h += H_TAG(optAnalysisTitle, "🔍", "#d97706")
  h += `<table class="mt w-full border-collapse my-2 text-sm"><tr><th class="border border-gray-300 dark:border-gray-700 p-2 text-left bg-gray-100 dark:bg-gray-800">${colOpt}</th><th class="border border-gray-300 dark:border-gray-700 p-2 text-left bg-gray-100 dark:bg-gray-800">${colStmt}</th><th class="border border-gray-300 dark:border-gray-700 p-2 text-left bg-gray-100 dark:bg-gray-800">${colVerdict}</th></tr>`
  h += item.o
    .map((o, k) => {
      const isCorrect = k === item.a
      const verdictHtml =
        item.a < 0
          ? "–"
          : isCorrect
          ? `<span class="text-emerald-600 font-bold">${correctLabel}</span>`
          : `<span class="text-rose-600 font-bold">${incorrectLabel}</span>`
      return `<tr><td class="border border-gray-300 dark:border-gray-700 p-2 font-mono">(${optionLetters[k]})</td><td class="border border-gray-300 dark:border-gray-700 p-2">${isNum(o) ? `<span class="font-mono">${esc(o)}</span>` : esc(o)}</td><td class="border border-gray-300 dark:border-gray-700 p-2">${verdictHtml}</td></tr>`
    })
    .join("")
  h += `</table>`

  // Related Points from other questions
  const mine = extractKeywords(`${item.q} ${item.o.join(" ")} ${item.exp || ""}`)
  const rel: [number, string, FormatterQuestionInput][] = []

  pool.forEach((x) => {
    if (x.id === item.id || (x.type && x.type !== "MCQ") || !x.exp) return
    sents(x.exp.replace(/\n/g, " ")).forEach((sn) => {
      if (item.exp && item.exp.includes(sn)) return
      let overlap = 0
      extractKeywords(sn).forEach((w) => {
        if (mine.has(w)) overlap++
      })
      if (overlap >= 2) {
        rel.push([overlap, sn, x])
      }
    })
  })

  rel.sort((a, b) => b[0] - a[0])
  const seen = new Set<string | number>()
  const pick = rel.filter((r) => !seen.has(r[2].id) && seen.add(r[2].id)).slice(0, 3)

  if (pick.length) {
    const relPointsTitle = isHi ? "संबंधित बिंदु" : "Related Points"
    h += H_TAG(relPointsTitle, "📌", "#dc2626")
    h += `<ul class="list-disc pl-5 my-2 space-y-1">${pick.map((r) => `<li>${hl(r[1])}</li>`).join("")}</ul>`
  }

  h += `</div>`
  return h
}
