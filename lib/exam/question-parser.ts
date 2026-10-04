export interface NormalizedQuestionInput {
  questionEn: string
  questionHi?: string
  optionAEn: string
  optionAHi?: string
  optionBEn: string
  optionBHi?: string
  optionCEn: string
  optionCHi?: string
  optionDEn: string
  optionDHi?: string
  correctOption: "A" | "B" | "C" | "D"
  explanationEn?: string
  explanationHi?: string
  difficulty?: string
  subject?: string
  topic?: string
}

/**
 * Normalizes and validates a question item from JSON/CSV/AI import.
 * Supports:
 * - options as object { A, B, C, D } (case-insensitive keys)
 * - options as array of 4 strings or objects
 * - flat keys: optionA/optionAEn/option_a/option_a_en/optA
 * - correct_answer as letter A-D (case-insensitive, formatted) or matching option text
 * - explanation / explanation_hi mapping
 * - topic / subject mapping
 * - preserves \n line breaks in question text
 * - strict validation: rejects empty question, missing/empty options, or invalid answer
 */
export function parseAndValidateQuestion(item: any, index: number): NormalizedQuestionInput {
  const qNum = index + 1

  if (!item || typeof item !== "object") {
    throw new Error(`Question ${qNum}: Invalid question format, expected an object.`)
  }

  // 1. Question text (preserve \n line breaks)
  const rawQEn =
    item.question ??
    item.questionEn ??
    item.question_en ??
    item.text ??
    item.textEnglish ??
    ""
  const questionEn = String(rawQEn)
  if (!questionEn.trim()) {
    throw new Error(`Question ${qNum}: Question text cannot be empty.`)
  }

  const rawQHi = item.questionHi ?? item.question_hi ?? item.textHindi ?? item.hindi ?? ""
  const questionHi = rawQHi ? String(rawQHi) : undefined

  // 2. Options extraction
  let optA = ""
  let optB = ""
  let optC = ""
  let optD = ""

  let optAHi = ""
  let optBHi = ""
  let optCHi = ""
  let optDHi = ""

  // Case A: options is an object { A, B, C, D } or { a, b, c, d }
  if (item.options && typeof item.options === "object" && !Array.isArray(item.options)) {
    const o = item.options
    optA = String(o.A ?? o.a ?? o["1"] ?? "")
    optB = String(o.B ?? o.b ?? o["2"] ?? "")
    optC = String(o.C ?? o.c ?? o["3"] ?? "")
    optD = String(o.D ?? o.d ?? o["4"] ?? "")
  }
  // Case B: options is an array
  else if (Array.isArray(item.options)) {
    const getOptVal = (entry: any) => {
      if (entry === null || entry === undefined) return ""
      if (typeof entry === "object") {
        return String(entry.english ?? entry.text ?? entry.value ?? "")
      }
      return String(entry)
    }
    const getOptHi = (entry: any) => {
      if (entry && typeof entry === "object") {
        return entry.hindi ? String(entry.hindi) : ""
      }
      return ""
    }

    optA = getOptVal(item.options[0])
    optB = getOptVal(item.options[1])
    optC = getOptVal(item.options[2])
    optD = getOptVal(item.options[3])

    optAHi = getOptHi(item.options[0])
    optBHi = getOptHi(item.options[1])
    optCHi = getOptHi(item.options[2])
    optDHi = getOptHi(item.options[3])
  }

  // Case C: Flat keys fallback
  if (!optA) {
    optA = String(item.optionAEn ?? item.optionA ?? item.option_a ?? item.option_a_en ?? item.optA ?? item.opt_a ?? "")
  }
  if (!optB) {
    optB = String(item.optionBEn ?? item.optionB ?? item.option_b ?? item.option_b_en ?? item.optB ?? item.opt_b ?? "")
  }
  if (!optC) {
    optC = String(item.optionCEn ?? item.optionC ?? item.option_c ?? item.option_c_en ?? item.optC ?? item.opt_c ?? "")
  }
  if (!optD) {
    optD = String(item.optionDEn ?? item.optionD ?? item.option_d ?? item.option_d_en ?? item.optD ?? item.opt_d ?? "")
  }

  // Hindi flat keys
  if (!optAHi) optAHi = String(item.optionAHi ?? item.option_a_hi ?? item.optionsHi?.[0] ?? "")
  if (!optBHi) optBHi = String(item.optionBHi ?? item.option_b_hi ?? item.optionsHi?.[1] ?? "")
  if (!optCHi) optCHi = String(item.optionCHi ?? item.option_c_hi ?? item.optionsHi?.[2] ?? "")
  if (!optDHi) optDHi = String(item.optionDHi ?? item.option_d_hi ?? item.optionsHi?.[3] ?? "")

  // Validate non-empty options
  if (!optA.trim()) throw new Error(`Question ${qNum}: Option A cannot be empty.`)
  if (!optB.trim()) throw new Error(`Question ${qNum}: Option B cannot be empty.`)
  if (!optC.trim()) throw new Error(`Question ${qNum}: Option C cannot be empty.`)
  if (!optD.trim()) throw new Error(`Question ${qNum}: Option D cannot be empty.`)

  // 3. Correct answer mapping
  const rawAns =
    item.correct_answer ??
    item.correctAnswer ??
    item.correctOption ??
    item.correct_option ??
    item.answer ??
    item.ans ??
    item.key

  if (rawAns === undefined || rawAns === null || String(rawAns).trim() === "") {
    throw new Error(`Question ${qNum}: Missing correct answer.`)
  }

  let correctOption: "A" | "B" | "C" | "D" | null = null

  if (typeof rawAns === "number") {
    if (rawAns >= 0 && rawAns <= 3) {
      correctOption = (["A", "B", "C", "D"] as const)[rawAns]
    } else if (rawAns >= 1 && rawAns <= 4) {
      correctOption = (["A", "B", "C", "D"] as const)[rawAns - 1]
    }
  } else {
    const trimmed = String(rawAns).trim()
    const letterMatch = trimmed.match(/^(?:Option\s*)?\(?([A-Da-d])\)?[\.\:\s]*$/i)
    if (letterMatch) {
      correctOption = letterMatch[1].toUpperCase() as "A" | "B" | "C" | "D"
    } else {
      // Check if text matches option text directly
      const normTrim = (s: string) => s.trim().toLowerCase()
      const t = normTrim(trimmed)
      if (t === normTrim(optA)) correctOption = "A"
      else if (t === normTrim(optB)) correctOption = "B"
      else if (t === normTrim(optC)) correctOption = "C"
      else if (t === normTrim(optD)) correctOption = "D"
    }
  }

  if (!correctOption || !["A", "B", "C", "D"].includes(correctOption)) {
    throw new Error(
      `Question ${qNum}: Invalid correct answer '${rawAns}'. Must be A, B, C, D or match an option text.`
    )
  }

  // 4. Explanations
  const rawExpEn =
    item.explanationEn ??
    item.explanation ??
    item.explanation_en ??
    item.explanationEnglish ??
    item.solution ??
    item.exp ??
    ""
  const explanationEn = rawExpEn ? String(rawExpEn) : undefined

  const rawExpHi =
    item.explanationHi ??
    item.explanation_hi ??
    item.explanationHindi ??
    ""
  const explanationHi = rawExpHi ? String(rawExpHi) : undefined

  // 5. Difficulty, Subject, Topic
  const diff = String(item.difficulty ?? "MODERATE").toUpperCase()
  const difficulty = ["EASY", "MODERATE", "HARD"].includes(diff) ? diff : "MODERATE"

  const topic = item.topic ? String(item.topic) : undefined
  const subject = item.subject ? String(item.subject) : (topic ? topic.split(":")[0]?.trim() : undefined)

  return {
    questionEn,
    questionHi,
    optionAEn: optA,
    optionAHi: optAHi || undefined,
    optionBEn: optB,
    optionBHi: optBHi || undefined,
    optionCEn: optC,
    optionCHi: optCHi || undefined,
    optionDEn: optD,
    optionDHi: optDHi || undefined,
    correctOption,
    explanationEn,
    explanationHi,
    difficulty,
    subject,
    topic,
  }
}
