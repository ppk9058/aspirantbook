/**
 * Multi-layout Exam Question Parser
 * Source: Exam_Content_Engine-4.html
 */

import { examOf, yearOf, detectBracketTag } from "./exam-detector"
import { classify } from "./classifier"
import { SUBS, HS } from "./taxonomy"

export interface ParsedQuestion {
  id?: number | string
  no?: number
  q: string
  o: string[]
  ans: string
  a: number
  exp: string
  src: string
  exam: string
  year: string
  sub: string
  top: string
  type: "MCQ" | "Note"
  inferred?: boolean
}

export const HDR =
  /\b[A-Z]\s?[–-]\s?\d+\s+General Studies(?:\s+(?:Indian|World)\s+\w+)?|(?:(?:Indian|World)\s+\w+\s+)?General Studies\s+[A-Z]\s?[–-]\s?\d+/g

export const OPT = /^\(?([A-Ea-e1-5])[.)]\s*(.+)/

const HLT: Record<string, string> = { "क": "a", "ख": "b", "ग": "c", "घ": "d", "ङ": "e" }

/**
 * Normalizes Hindi question prefixes into English equivalents for uniform parsing.
 */
export function hiNorm(t: string): string {
  if (!/[\u0900-\u097F]/.test(t)) return t
  return t
    .normalize("NFC")
    .split("\n")
    .map((l) => {
      let x = l.replace(/^\s*प्रश्न\s*(\d+)\s*[.):\-]?\s*/, "Q$1. ")
      x = x
        .replace(/^(\s*)(?:सही\s+)?उत्तर\s*[:\-.)]\s*/, "$1Answer: ")
        .replace(/^(\s*)(?:व्याख्या|स्पष्टीकरण|समाधान)\s*[:\-.]\s*/, "$1Explanation: ")
        .replace(/^(\s*)(?:परीक्षा|स्रोत|पूर्व में पूछा गया|पूछा गया)\s*[:\-]\s*/, "$1Exam: ")
        .replace(/^(\s*)वर्ष\s*[:\-]\s*/, "$1Year: ")
        .replace(/^(\s*)विषय\s*[:\-]\s*/, "$1Subject: ")
        .replace(/^(\s*)(?:अध्याय|टॉपिक)\s*[:\-]\s*/, "$1Topic: ")
      x = x.replace(/^(\s*)\(?([कखगघङ])[.)]\s*/, (_m, a, b) => a + "(" + HLT[b] + ") ")
      x = x.replace(/^(\s*Answer:\s*)\(?([कखगघङ])\)?/, (_m, a, b) => a + HLT[b])
      return x
    })
    .join("\n")
}

/**
 * Checks if raw text is flat run-together PDF text with (a) / (b) on the same line.
 */
export function isFlat(t: string): boolean {
  const n = (t.match(/\(\s*a\s*\)/gi) || []).length
  const l = t.split("\n").filter((x) => x.trim()).length
  return n >= 2 && l < n / 2
}

const ABBR = /(?:\b\d{1,2}(?:st|nd|rd|th)\s+)?\b(?:[A-Z]\s?\.\s?){2,}/

/**
 * Unstacks flat run-together PDF text into well-formed question blocks.
 */
export function flat(t: string): string {
  t = t
    .replace(/@\w+/g, " ")
    .replace(/Join Telegram:?/gi, " ")
    .replace(HDR, " ")
    .replace(/\s+/g, " ")
    .trim()

  const re = /(?:^|\s)(\d{1,3})[.)]\s+(?=\S)/g
  const b: { n: number; s: number; e: number }[] = []
  let m: RegExpExecArray | null
  let exp: number | null = null

  while ((m = re.exec(t))) {
    const n = +m[1]
    if (exp === null) {
      if (m.index > 30) continue
      exp = n
    }
    const prev = b.length ? t.slice(b[b.length - 1].e, m.index) : "(b)"
    if (n >= exp && n < exp + 80 && /\(\s*[bB]\s*\)/.test(prev)) {
      b.push({ n, s: m.index + (/^\s/.test(m[0]) ? 1 : 0), e: m.index + m[0].length })
      exp = n + 1
    }
  }

  if (!b.length) return t

  return b
    .map((x, k) => {
      const seg = t.slice(x.e, k + 1 < b.length ? b[k + 1].s : t.length).trim()
      const ai = seg.search(/\(\s*[aA]\s*\)/)
      if (ai < 1) return "Q" + x.n + ". " + seg

      const q = seg.slice(0, ai).trim()
      const rest = seg.slice(ai)
      const am = rest.match(/\bAns(?:wer)?\.?\s*[:.]?\s*\(?([a-eA-E])\)?(?![A-Za-z])/)
      const amIndex = am && am.index !== undefined ? am.index : -1
      const pre = amIndex >= 0 ? rest.slice(0, amIndex) : rest
      const ex = am && amIndex >= 0 ? rest.slice(amIndex + am[0].length).trim() : ""
      const tk = pre.split(/\(\s*([a-eA-E])\s*\)\s*/)
      const o: string[] = []
      let nx = 0

      for (let i = 1; i < tk.length; i += 2) {
        if (tk[i].toLowerCase() === "abcde"[nx]) {
          o.push(tk[i + 1].trim())
          nx++
        } else if (o.length) {
          o[o.length - 1] += " (" + tk[i] + ") " + tk[i + 1]
        }
      }

      let src = ""
      if (o.length) {
        const L = o[o.length - 1]
        let cut = L.search(ABBR)
        if (cut < 0) {
          const em = examOf(L)
          if (em) cut = L.search(new RegExp(em, "i"))
        }
        if (cut > 0 && /\b(19|20)\d\d\b/.test(L.slice(cut))) {
          src = L.slice(cut).trim()
          o[o.length - 1] = L.slice(0, cut).trim()
        }
      }

      return ["Q" + x.n + ". " + q]
        .concat(
          o.map((v, idx) => "ABCDE"[idx] + ") " + v),
          src ? ["Source: " + src] : [],
          am ? ["Answer: " + am[1]] : [],
          ex ? ["Explanation: " + ex] : []
        )
        .join("\n")
    })
    .join("\n\n")
}

/**
 * Resolves answer string to 0-based option index.
 */
export function ansIdx(a: string, o: string[]): number {
  if (!a) return -1
  const m = a.match(/^\(?([A-Ea-e1-5])\)?(?:[.\s:\-]|$)/)
  if (m) {
    const c = m[1].toLowerCase()
    const i = /\d/.test(c) ? +c - 1 : c.charCodeAt(0) - 97
    if (i < o.length) return i
  }
  const t = a.toLowerCase().replace(/^\(?[a-e1-5][.)]\s*/, "").trim()
  return o.findIndex((x) => {
    const xl = x.toLowerCase()
    return xl === t || (t.length > 2 && xl.includes(t))
  })
}

export interface MatchQuestion {
  stem: string
  head: string
  rows: [string, string, string, string][]
  codes: string
}

export function matchParse(q: string): MatchQuestion | null {
  if (!q || typeof q !== "string") return null
  let li = q.search(/List\s*[-–]?\s*I\s*List\s*[-–]?\s*II\b/i)
  if (li < 0) li = q.search(/List\s*[-–]?\s*I\b/i)
  if (li < 0) return null

  const ci = q.search(/\bCodes?\s*:/i)
  const body = q.slice(li, ci > 0 ? ci : undefined)
  const ai = body.search(/\bA\.\s/)
  if (ai < 0) return null

  const re = /([A-E])\.\s+(.+?)\s+(\d)\.\s+(.+?)(?=\s+[A-E]\.\s+\S|$)/g
  const rows: [string, string, string, string][] = []
  const rest = body.slice(ai)
  let m: RegExpExecArray | null
  while ((m = re.exec(rest))) {
    rows.push([m[1], m[2].trim(), m[3], m[4].trim()])
  }

  if (rows.length < 2) return null
  return {
    stem: q.slice(0, li).trim(),
    head: body.slice(0, ai),
    rows,
    codes: ci > 0 ? q.slice(ci).replace(/^Codes?\s*:\s*/i, "").trim() : "",
  }
}

export interface StmtQuestion {
  stem: string
  sts: string[]
  tail: string
}

export function stmtParse(q: string): StmtQuestion | null {
  const norm = q.replace(/\s+/g, " ").trim()
  const m = norm.match(/^(.+?)\s+1\s*[.)]\s+(.+)$/)
  if (!m || /List\s*[-–]?\s*I\b/i.test(norm)) return null

  const rest = m[2]
  const pos: number[] = [0]
  for (let n = 2; n <= 6; n++) {
    const r = new RegExp(`\\s${n}\\s*[.)]\\s+`).exec(rest.slice(pos[pos.length - 1]))
    if (!r) break
    pos.push(pos[pos.length - 1] + r.index + r[0].length)
  }

  if (pos.length < 2) return null
  const raw = pos.map((p, k) => {
    const e = k + 1 < pos.length ? rest.lastIndexOf(" " + (k + 2), pos[k + 1]) : rest.length
    return rest.slice(p, e < p ? rest.length : e).trim()
  })

  const last = raw[raw.length - 1]
  let tail = ""
  const t = last.search(
    /(?:[.;]\s+|\s)(?=(?:Select|Choose|Which of the (?:above|statements|following)|Which one|How many|Use the code|Codes?:|Identify)\b)/
  )
  if (t > 0) {
    tail = last.slice(t).replace(/^[.;]\s*/, "").replace(/\s*Codes?\s*:?\s*$/i, "").trim()
    raw[raw.length - 1] = last.slice(0, t).trim() + (last[t] === "." ? "." : "")
  }

  return {
    stem: m[1].trim(),
    sts: raw.map((x) => x.replace(/[;,]?\s*(and|or)?\s*$/, "").trim()),
    tail,
  }
}

export function shortQ(q: string): string {
  const st = stmtParse(q)
  let t = (st ? st.stem : q)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:which|what|who|where|when)\s+(?:one\s+)?of\s+the\s+(?:following|given)\s+/i, "")
    .replace(
      /^(?:statements?\s+)?(?:is|are)(?:\/(?:is|are))?\s+(?:correct|true|incorrect|false|not correct)\s+(?:regarding|about|with respect to|for)\s+/i,
      ""
    )
    .replace(/^(?:consider|read)\s+the\s+following\s+(?:statements?\s*)?[:.]?\s*/i, "")
    .replace(/[?.:;,\s]+$/, "")

  if (t.length > 60) {
    let c = t.slice(0, 60)
    const sp = c.lastIndexOf(" ")
    if (t[60] !== " " && sp > 20) c = c.slice(0, sp)
    t = c
  }

  t = t
    .replace(
      /(?:[\s,:;]+(?:the|a|an|of|in|on|at|to|for|by|as|and|or|is|was|are|were|with|from|that|which|who|where|whose))+[\s,:;]*$/i,
      ""
    )
    .replace(/[\s,:;]+$/, "")

  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Strips whole OCR junk lines, e.g. [P.T.O., page numbers, paper code lines, 7+ digit roll numbers.
 * Keeps real content lines like "1.5 kg of salt", "2024 budget", "Article 102".
 */
export function isOcrJunkLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (/^\[?\s*P\.?\s*T\.?\s*O\.?\s*\]?$/i.test(t)) return true
  if (/^\d{7,}$/.test(t)) return true
  if (/^(?:[-–—]\s*)?\d{1,3}(?:\s*[-–—])?$/.test(t)) return true
  if (
    /^\d{2}\/[A-Z0-9\/_()\-.\s]{5,}$/i.test(t) &&
    !/\b(?:of|the|is|in|at|and|with|for|was|were|salt|budget|article)\b/i.test(t)
  ) {
    return true
  }
  return false
}

/**
 * Checks if parenthesized options (A)-(D), [A]-[D], or A) exist ahead in upcoming lines of the current question.
 */
function hasParenOptionsAhead(lines: string[], startIndex: number): boolean {
  const limit = Math.min(lines.length, startIndex + 30)
  for (let i = startIndex; i < limit; i++) {
    const l = lines[i].trim()
    if (!l) continue
    if (/^Q(?:uestion)?\.?\s*\d+/i.test(l)) break
    if (/^(?:correct\s+)?(?:ans(?:wer)?|key)\s*[:\-.)]/i.test(l)) break
    if (/^\s*(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-D]\))\s+\S/.test(l)) {
      return true
    }
    if (/\([A-Da-d]\)\s+.*\([Bb]\)/.test(l)) {
      return true
    }
  }
  return false
}

/**
 * Diagnostic parse function returning both parsed questions and dropped/skipped snippets.
 */
export function parseWithDiagnostics(
  txt: string,
  customAliases?: string[]
): { questions: ParsedQuestion[]; skipped: string[] } {
  let normalized = hiNorm(txt)
  if (isFlat(normalized)) {
    normalized = flat(normalized)
  }

  const out: ParsedQuestion[] = []
  const skipped: string[] = []
  const keys: Record<string, string> = {}
  const ctx = { sub: "", top: "", src: "" }

  interface CurrentItem {
    no: number
    q: string
    o: string[]
    ans: string
    exp: string
    src: string
    sub: string
    top: string
  }

  let cur: CurrentItem | null = null
  let mode = ""
  let blank = false

  const fin = () => {
    if (!cur) return
    const q = cur.q.trim()
    if (q.length >= 3 && (cur.o.length >= 2 || q.length > 25)) {
      const type: "MCQ" | "Note" = cur.o.length >= 2 ? "MCQ" : "Note"
      out.push({
        no: cur.no,
        q,
        o: cur.o,
        ans: cur.ans,
        a: -1,
        exp: cur.exp,
        src: cur.src,
        exam: "",
        year: "",
        sub: cur.sub,
        top: cur.top,
        type,
      })
    } else if (q.length > 0) {
      skipped.push(q.slice(0, 120))
    }
    cur = null
    mode = ""
  }

  const start = (q: string, no: number) => {
    fin()
    cur = {
      no,
      q,
      o: [],
      ans: "",
      exp: "",
      src: ctx.src,
      sub: ctx.sub,
      top: ctx.top,
    }
    mode = "q"
  }

  const addOpt = (t: string) => {
    if (cur) {
      cur.o.push(t.trim())
      mode = "o"
    }
  }

  const lines = normalized.replace(/\r/g, "").split("\n")

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const raw = lines[lineIdx]
    const l = raw.trim()

    if (!l) {
      blank = true
      continue
    }

    // C3: OCR junk lines stripping
    if (isOcrJunkLine(l)) {
      skipped.push(l)
      continue
    }

    const parenAhead = cur && mode === "q" && hasParenOptionsAhead(lines, lineIdx)

    // C5: Blank lines inside stem before parenthesized options do NOT split the question
    const wb = blank && !parenAhead
    blank = false
    let m: RegExpMatchArray | null

    const pairs = l.match(/\d+\s*[-:.)]\s*\(?[A-Da-d]\)?(?=[\s,;]|$)/g)
    if (/^answers?\s*key/i.test(l) || (pairs && pairs.length >= 3 && !/^(Q\d|expl|sol)/i.test(l))) {
      const re = /(\d+)\s*[-:.)]\s*\(?([A-Da-d])\)?(?=[\s,;]|$)/g
      let x: RegExpExecArray | null
      while ((x = re.exec(l))) {
        keys[x[1]] = x[2].toLowerCase()
      }
      mode = "key"
      continue
    }

    if ((m = l.match(/^(?:#{1,4}|={2,}|\*{2,})\s*(.+?)[\s=*#]*$/))) {
      const h = m[1]
      if (examOf(h, customAliases) || /\b(19|20)\d\d\b/.test(h)) {
        ctx.src = h
      } else if (SUBS.includes(h)) {
        ctx.sub = h
      } else {
        ctx.top = h
      }
      blank = true
      continue
    }

    if ((m = l.match(/^(subject|topic|chapter|section)\s*[:\-]\s*(.+)/i))) {
      const t = cur && cur.o.length && !wb ? cur : ctx
      if (/subj/i.test(m[1])) t.sub = m[2].trim()
      else t.top = m[2].trim()
      if (t === ctx) blank = true
      continue
    }

    if ((m = l.match(/^(source|asked in|previously asked in|previous year|exam|paper|year|shift)\s*[:\-]\s*(.+)/i))) {
      const t = cur && cur.o.length && !wb ? cur : ctx
      const v = m[2].trim()
      t.src = /year|shift/i.test(m[1]) && t.src ? t.src + " " + v : v
      if (t === ctx) blank = true
      continue
    }

    if (cur && (m = l.match(/^(?:correct\s+)?(?:ans(?:wer)?|key)\s*[:\-.)]\s*(.+)/i))) {
      cur.ans = m[1].trim()
      mode = "a"
      continue
    }

    if (cur && (m = l.match(/^(?:explanation|solution|rationale|sol|hint)\s*(?:[:\-.]\s*(.*))?$/i))) {
      cur.exp = (m[1] || "").trim()
      mode = "e"
      continue
    }

    if ((m = l.match(/^Q(?:uestion)?\.?\s*(\d+)\s*[.):\-]?\s*(.*)/i))) {
      start(m[2], +m[1])
      continue
    }

    // Split multiple options on same line: (A) ... (B) ...
    const ip = l.split(/\s+(?=\(?[A-Da-d1-4][.)]\s)/)
    if (cur && cur.q && mode !== "a" && mode !== "e" && ip.length >= 3 && ip.every((x) => OPT.test(x))) {
      ip.forEach((x) => {
        const optMatch = x.match(OPT)
        if (optMatch) addOpt(optMatch[2])
      })
      continue
    }

    // C1 & C2: If parenthesized options (A)-(D) exist ahead, statement lines stay in question stem
    if (parenAhead) {
      // If it's a parenthesized option line, parse as option!
      const parenOptMatch = l.match(/^\s*(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-E])\))\s*(.+)/)
      if (parenOptMatch) {
        addOpt(parenOptMatch[4])
        continue
      }
      // Otherwise (statement line: a., 1., i., List-I, Which is correct?, etc.), append to question stem!
      cur.q += (cur.q ? "\n" : "") + l
      continue
    }

    // C4: Decimal-led lines such as "1.5 kg ..." or "2.0 m/s ..." must not start a new numbered question
    if (/^\d{1,3}\.\d/.test(l)) {
      if (cur) {
        cur.q += (cur.q ? " " : "") + l
        continue
      }
    }

    // Standard Parenthesized option line: (A), (a), [A], A)
    const parenOptMatch = l.match(/^\s*(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-E])\))\s*(.+)/)
    if (parenOptMatch && cur && cur.q && mode !== "a" && mode !== "e") {
      addOpt(parenOptMatch[4])
      continue
    }

    // Lettered options A. / B. / C. / D. (uppercase)
    const upperOptMatch = l.match(/^([A-E])\.\s*(.+)/)
    if (upperOptMatch && cur && cur.q && mode !== "a" && mode !== "e") {
      const idx = upperOptMatch[1].charCodeAt(0) - 65
      if (idx === cur.o.length) {
        addOpt(upperOptMatch[2])
        continue
      }
    }

    // Numbered options 1. 2. 3. 4. when NO parenthesized options exist ahead
    const numOptMatch = l.match(/^([1-5])[.)]\s*(.+)/)
    if (numOptMatch && cur && cur.q && mode !== "a" && mode !== "e") {
      const idx = +numOptMatch[1] - 1
      if (idx === cur.o.length && cur.o.length < 5) {
        addOpt(numOptMatch[2])
        continue
      }
    }

    // Standard OPT regex fallback
    if ((m = l.match(OPT))) {
      const lab = m[1].toLowerCase()
      const idx = /\d/.test(lab) ? +lab - 1 : lab.charCodeAt(0) - 97
      if (cur && cur.q && mode !== "a" && mode !== "e" && idx === cur.o.length && (cur.o.length < 4 || lab === "e")) {
        addOpt(m[2])
        continue
      }
      if (/\d/.test(lab)) {
        start(m[2], +lab)
        continue
      }
    }

    // Numbered question start: 1. 2. 12. (dot not followed by digit to avoid decimals)
    if ((m = l.match(/^(\d{1,3})\s*(?:\.(?!\d)|\))\s+(.+)/))) {
      start(m[2], +m[1])
      continue
    }

    if (!cur) {
      start(l, 0)
      continue
    }

    if (mode === "e" || mode === "a") {
      if (wb) start(l, 0)
      else cur.exp += (cur.exp ? "\n" : "") + l
      continue
    }

    if (mode === "key") {
      start(l, 0)
      continue
    }

    if (mode === "o") {
      if (wb || cur.o.length >= 4) start(l, 0)
      else cur.o[cur.o.length - 1] += " " + l
      continue
    }

    if (wb) start(l, 0)
    else cur.q += " " + l
  }

  fin()

  out.forEach((i, k) => {
    i.id = k + 1
    if (!i.ans && i.no && keys[String(i.no)]) {
      i.ans = keys[String(i.no)]
    }

    // Bracket tag detection
    const { cleanQuestion, tag } = detectBracketTag(i.q, customAliases)
    if (tag) {
      i.src = tag
      i.q = cleanQuestion
    }

    i.a = ansIdx(i.ans, i.o)
    i.year = yearOf(i.src)
    i.exam = examOf(i.src, customAliases)

    const c = classify(i.q + " " + i.o.join(" ") + " " + (i.exp || ""), i.sub)
    i.sub = !i.sub || (i.sub === "History" && HS.includes(c[0])) ? c[0] : i.sub
    i.top = i.top || c[1]
  })

  return { questions: out, skipped }
}

/**
 * Main parse function porting prototype behavior faithfully.
 */
export function parse(txt: string, customAliases?: string[]): ParsedQuestion[] {
  return parseWithDiagnostics(txt, customAliases).questions
}
