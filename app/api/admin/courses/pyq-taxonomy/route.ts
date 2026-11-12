import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"

export async function GET() {
  try {
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Default taxonomy representing standard competitive exams
    const standardTaxonomy: Record<string, Record<string, string[]>> = {
      UPSC: {
        Polity: ["Constitution", "Preamble & Fundamental Rights", "Parliament & Judiciary", "Panchayati Raj", "Governance"],
        History: ["Ancient India", "Medieval India", "Modern Freedom Struggle", "Art & Culture"],
        Geography: ["Physical Geography", "Indian Geography", "Economic Geography", "Environment & Ecology"],
        Economy: ["National Income", "Banking & Monetary Policy", "Fiscal Policy & Budget", "Agriculture & Industry"],
        Aptitude: ["Numeracy & Calculation", "Comprehension", "Logical Reasoning", "Data Interpretation"],
      },
      SSC: {
        Mathematics: ["Number System", "Percentages", "Profit & Loss", "Algebra", "Geometry & Mensuration"],
        Reasoning: ["Analogies", "Syllogism", "Coding-Decoding", "Blood Relations", "Non-Verbal"],
        English: ["Grammar & Error Spotting", "Vocabulary & Idioms", "Reading Comprehension", "Cloze Test"],
        "General Awareness": ["Static GK", "Current Affairs", "General Science", "Polity & Constitution"],
      },
      Banking: {
        "Banking Awareness": ["RBI & Monetary Policy", "Banking Structure & Basel Accords", "NPA & IBC 2016", "Financial Markets"],
        Quantitative: ["Data Interpretation", "Simplification & Approximation", "Quadratic Equations", "Arithmetic"],
        Reasoning: ["Puzzles & Seating Arrangement", "Inequalities", "Input-Output", "Critical Reasoning"],
        English: ["Reading Comprehension", "Para Jumbles", "Error Detection", "Sentence Improvement"],
      },
      Railways: {
        Mathematics: ["Number System", "LCM & HCF", "Time & Work", "Speed, Time & Distance", "Simple & Compound Interest"],
        Reasoning: ["Syllogisms", "Venn Diagrams", "Mathematical Operations", "Data Sufficiency"],
        "General Awareness": ["Indian Railways History", "General Science", "Current Affairs", "Geography"],
      },
      BPSC: {
        History: ["Modern History & Bihar Art Forms", "1857 Revolt in Bihar", "Champaran Satyagraha", "Quit India Movement"],
        Geography: ["Physical Geography of Bihar", "Agricultural Zones & Rivers of Bihar", "Mineral Resources"],
        Polity: ["Political System of India & Bihar", "Constitutional Bodies", "Panchayati Raj in Bihar"],
        Statistics: ["Data Interpretation Graphs", "Tabulation", "Line & Bar Charts", "Pie Diagrams"],
      },
    }

    // Attempt to enrich with any distinct subjects/topics found in ContentEngineQuestion
    try {
      const distinctQuestions = await prisma.contentEngineQuestion.findMany({
        where: { sub: { not: null } },
        select: { exam: true, sub: true, top: true },
        take: 500,
      })

      for (const q of distinctQuestions) {
        const exam = q.exam || "General"
        const sub = q.sub
        const top = q.top
        if (!sub) continue

        if (!standardTaxonomy[exam]) standardTaxonomy[exam] = {}
        if (!standardTaxonomy[exam][sub]) standardTaxonomy[exam][sub] = []
        if (top && !standardTaxonomy[exam][sub].includes(top)) {
          standardTaxonomy[exam][sub].push(top)
        }
      }
    } catch (e) {
      // Keep standard taxonomy if DB query fails or table is empty
    }

    return NextResponse.json({
      success: true,
      taxonomy: standardTaxonomy,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load taxonomy" }, { status: 500 })
  }
}
