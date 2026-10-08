import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface TutorialAuditRow {
  id: string;
  title: string;
  currentTechnology: string;
  proposedGoals: string;
  lessonCount: number;
  reason: string;
}

export function getProposedGoals(title: string, currentTech: string): { proposed: string; reason: string } {
  const lowerTitle = title.toLowerCase();
  const lowerTech = currentTech.toLowerCase();

  if (lowerTitle.includes("agentic engineering: zero to hero")) {
    return {
      proposed: "skills",
      reason: "Advanced autonomous AI agent systems engineering masterclass (user requested 'skills')",
    };
  }

  if (lowerTitle.includes("agentic ai engineer") || lowerTech.includes("autonomous agents")) {
    return {
      proposed: "skills,data-science",
      reason: "Autonomous agents & multi-agent systems curriculum",
    };
  }

  if (lowerTitle.includes("prompt engineering") || lowerTech.includes("prompt engineering")) {
    return {
      proposed: "skills,data-science",
      reason: "Prompt engineering, structured LLM outputs and context window design",
    };
  }

  if (lowerTitle.includes("linear equation") || lowerTech.includes("linear equation")) {
    return {
      proposed: "NEEDS HUMAN DECISION",
      reason: "Micro-topic math curriculum; cannot assume class (Class 9th, 10th or JEE requires teacher confirmation)",
    };
  }

  if (
    lowerTitle.includes("genai") ||
    lowerTitle.includes("generative ai") ||
    lowerTech.includes("gen ai") ||
    lowerTech.includes("deep learning") ||
    lowerTech.includes("generative ai") ||
    lowerTitle.includes("imported tutorial") ||
    lowerTitle.includes("ai course")
  ) {
    return {
      proposed: "skills,data-science",
      reason: "Generative AI, LLM systems, deep learning and data science curriculum",
    };
  }

  if (lowerTech === "c" || lowerTitle.includes("foundations of c")) {
    return {
      proposed: "skills",
      reason: "Low-level C systems programming foundation",
    };
  }

  if (lowerTech.includes("python") || lowerTitle.includes("python")) {
    return {
      proposed: "skills,data-science",
      reason: "Python programming for development, data analysis and automation",
    };
  }

  return {
    proposed: "NEEDS HUMAN DECISION",
    reason: "Unclassified subject requiring instructor specification",
  };
}

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      chapters: {
        include: {
          lessons: {
            select: { id: true, title: true, type: true, videoUrl: true },
          },
        },
      },
    },
  });

  const textTutorials = courses.filter((c) => {
    if (c.slug === "72nd-bpsc-prelims-current-affairs") return false;
    const lowerTitle = (c.title || "").toLowerCase();
    const lowerSlug = (c.slug || "").toLowerCase();
    if (
      lowerTitle.includes("video course") ||
      lowerTitle.includes("video tutorial") ||
      lowerSlug.includes("video")
    ) {
      return false;
    }
    const allLessons = c.chapters?.flatMap((ch) => ch.lessons || []) || [];
    const hasVideoLessons = allLessons.some((l) => Boolean(l.videoUrl) || l.type === "VIDEO");
    if (hasVideoLessons) return false;
    return true;
  });

  const auditRows: TutorialAuditRow[] = textTutorials.map((t) => {
    const lessons = t.chapters.flatMap((ch) => ch.lessons).length;
    const { proposed, reason } = getProposedGoals(t.title, t.technology || "");
    return {
      id: t.id,
      title: t.title,
      currentTechnology: t.technology || "(empty)",
      proposedGoals: proposed,
      lessonCount: lessons,
      reason,
    };
  });

  console.log("\n============================================================================================================");
  console.log("STEP 3: TUTORIAL GOAL DATA AUDIT (DRY RUN ONLY - NO DATABASE ROWS WERE MODIFIED)");
  console.log("============================================================================================================\n");
  console.table(auditRows);
}

if (require.main === module) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
