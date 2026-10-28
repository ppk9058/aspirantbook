import fs from "fs"
import path from "path"
import { parseWithDiagnostics, isOcrJunkLine } from "@/lib/modules/content-engine/parser"
import { classify } from "@/lib/modules/content-engine/classifier"

interface DryRunReport {
  filePath: string
  totalParsed: number
  skippedCount: number
  first5Skipped: string[]
  junkLinesStripped: number
  questionNumbersOptionsNot4: number[]
  emptyStems: number[]
  stemsLookMerged: number[]
  distinctSubjectTopicPairs: string[]
  subjectCount: number
  topicCount: number
  taggedWithExamAndYearCount: number
  questions: Array<{
    no: number
    stemSnippet: string
    optionCount: number
    answer: string
    sub: string
    top: string
    exam: string
    year: string | number
  }>
}

export function runDryRun(filePath: string, saveJsonPath?: string): DryRunReport {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const rawText = fs.readFileSync(filePath, "utf-8")
  const lines = rawText.split("\n")
  const junkLinesCount = lines.filter((line) => isOcrJunkLine(line.trim())).length

  const { questions, skipped } = parseWithDiagnostics(rawText)

  const emptyStems: number[] = []
  const stemsLookMerged: number[] = []
  const optionsNot4: number[] = []
  const subjectTopicMap = new Map<string, Set<string>>()
  let taggedExamAndYear = 0

  const processedQuestions = questions.map((q) => {
    // 1. Check empty stem
    if (!q.q || !q.q.trim()) {
      emptyStems.push(q.no ?? 0)
    }

    // 2. Check merged stem: stem contains internal question number pattern e.g. "2." or "Q2."
    if (/\n\s*(?:Q\.?\s*\d+|\d+[.)])\s+[A-Za-z\u0900-\u097F]/.test(q.q)) {
      stemsLookMerged.push(q.no ?? 0)
    }

    // 3. Check option count != 4
    if (q.o.length !== 4) {
      optionsNot4.push(q.no ?? 0)
    }

    // 4. Classify if sub/top missing
    let sub = q.sub || ""
    let top = q.top || ""
    if (!sub || !top) {
      const [cSub, cTop] = classify(q.q)
      if (!sub) sub = cSub
      if (!top) top = cTop
    }

    if (sub) {
      if (!subjectTopicMap.has(sub)) subjectTopicMap.set(sub, new Set())
      if (top) subjectTopicMap.get(sub)!.add(top)
    }

    // 5. Exam & year
    const hasExam = Boolean(q.exam && q.exam.trim())
    const hasYear = Boolean(q.year)
    if (hasExam && hasYear) {
      taggedExamAndYear++
    }

    return {
      no: q.no ?? 0,
      stemSnippet: q.q.slice(0, 80).replace(/\s+/g, " "),
      optionCount: q.o.length,
      answer: q.ans || "",
      sub,
      top,
      exam: q.exam || "",
      year: q.year || "",
    }
  })

  const distinctPairs: string[] = []
  let totalTopics = 0
  for (const [s, tops] of subjectTopicMap.entries()) {
    totalTopics += tops.size
    for (const t of tops) {
      distinctPairs.push(`${s} / ${t}`)
    }
  }

  const report: DryRunReport = {
    filePath,
    totalParsed: questions.length,
    skippedCount: skipped.length,
    first5Skipped: skipped.slice(0, 5),
    junkLinesStripped: junkLinesCount,
    questionNumbersOptionsNot4: optionsNot4,
    emptyStems,
    stemsLookMerged,
    distinctSubjectTopicPairs: distinctPairs.sort(),
    subjectCount: subjectTopicMap.size,
    topicCount: totalTopics,
    taggedWithExamAndYearCount: taggedExamAndYear,
    questions: processedQuestions,
  }

  if (saveJsonPath) {
    fs.mkdirSync(path.dirname(saveJsonPath), { recursive: true })
    fs.writeFileSync(saveJsonPath, JSON.stringify(report, null, 2), "utf8")
    console.log(`Saved dry-run report JSON to ${saveJsonPath}`)
  }

  return report
}

// CLI Execution
if (require.main === module || process.argv[1]?.endsWith("content-engine-dry-run.ts")) {
  const targetFile = process.argv[2]
  const outJson = process.argv[3]

  if (!targetFile) {
    console.error("Usage: npx tsx scripts/content-engine-dry-run.ts <path-to-txt> [out-json-path]")
    process.exit(1)
  }

  try {
    const report = runDryRun(targetFile, outJson)
    console.log("\n=======================================================")
    console.log("CONTENT ENGINE OFFLINE DRY-RUN REPORT")
    console.log("=======================================================")
    console.log(`File: ${report.filePath}`)
    console.log(`Total Parsed: ${report.totalParsed}`)
    console.log(`Skipped Count: ${report.skippedCount}`)
    if (report.skippedCount > 0) {
      console.log(`First 5 Skipped:`, report.first5Skipped)
    }
    console.log(`Junk Lines Stripped: ${report.junkLinesStripped}`)
    console.log(`Option count != 4 count: ${report.questionNumbersOptionsNot4.length}`)
    if (report.questionNumbersOptionsNot4.length > 0) {
      console.log(`Questions with options != 4:`, report.questionNumbersOptionsNot4)
    }
    console.log(`Empty stems count: ${report.emptyStems.length}`)
    console.log(`Merged stems count: ${report.stemsLookMerged.length}`)
    console.log(`Distinct Subjects: ${report.subjectCount}`)
    console.log(`Distinct Topics: ${report.topicCount}`)
    console.log(`Tagged with Exam & Year: ${report.taggedWithExamAndYearCount}`)
    console.log("=======================================================\n")
  } catch (err: any) {
    console.error("Dry run error:", err.message)
    process.exit(1)
  }
}
