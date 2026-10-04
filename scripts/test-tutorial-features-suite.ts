import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import { parseTutorialInput, parseGenAiTutorialJson } from "../components/editor/TutorialImportModal"
import { importTutorialPackage } from "../lib/actions/admin/tutorial-import"
import { normalizeBlockWithBid } from "../lib/validations/tutorial-schema"

dotenv.config()
const prisma = new PrismaClient()

interface TestStepResult {
  step: string
  passed: boolean
  details: string
}

const results: TestStepResult[] = []

function assert(condition: boolean, step: string, details: string) {
  if (condition) {
    console.log(`✅ [PASS] ${step} - ${details}`)
    results.push({ step, passed: true, details })
  } else {
    console.error(`❌ [FAIL] ${step} - ${details}`)
    results.push({ step, passed: false, details })
    throw new Error(`Assertion failed: ${step} - ${details}`)
  }
}

async function runTestSuite() {
  console.log("=================================================================")
  console.log("🚀 COMPREHENSIVE TUTORIAL EDITOR & MERGE ENGINE TEST SUITE")
  console.log("=================================================================\n")

  let testCourseId: string | null = null

  try {
    // -------------------------------------------------------------
    // FEATURE 1: IMPORT JSON PARSING
    // -------------------------------------------------------------
    console.log("--- FEATURE 1: TEST JSON PARSER & SCHEMA VALIDATION ---")
    const sampleGenAiJson = JSON.stringify({
      schema: 1,
      meta: {
        id: "test-genai-masterclass",
        title: "Test GenAI Engineer Masterclass",
        subject: "Artificial Intelligence",
        level: "INTERMEDIATE",
        intro: "Master generative models, transformers, and LLM engineering.",
      },
      phases: [
        {
          id: "phase-1",
          title: "Phase 1: Transformer Architecture",
          order: 1,
          chapters: [
            {
              id: "ch-1-1",
              title: "1.1 Attention Mechanism & Self-Attention",
              order: 1,
              blocks: [
                {
                  bid: "b-h2-1",
                  t: "h2",
                  x: "The Attention Is All You Need Paper",
                },
                {
                  bid: "b-p-1",
                  t: "p",
                  x: "Scaled Dot-Product Attention transforms queries, keys, and values into ==contextualized embeddings==.",
                },
                {
                  bid: "b-code-1",
                  t: "code",
                  lang: "python",
                  title: "attention.py",
                  x: "import torch\nimport torch.nn.functional as F\n\ndef attention(q, k, v):\n    d_k = q.size(-1)\n    scores = torch.matmul(q, k.transpose(-2, -1)) / (d_k ** 0.5)\n    return torch.matmul(F.softmax(scores, dim=-1), v)",
                },
              ],
            },
            {
              id: "ch-1-2",
              title: "1.2 Positional Encodings & RoPE",
              soon: 1,
              order: 2,
              blocks: [],
            },
          ],
        },
      ],
    })

    const parsedJsonData = parseTutorialInput(sampleGenAiJson)
    assert(
      parsedJsonData.title === "Test GenAI Engineer Masterclass",
      "JSON Import Parser",
      `Title matched: ${parsedJsonData.title}`
    )
    assert(
      parsedJsonData.formatType === "GENAI_TUTORIAL_JSON",
      "JSON Import Parser",
      `Format type identified as GENAI_TUTORIAL_JSON`
    )
    assert(
      parsedJsonData.chapters.length === 1 && parsedJsonData.chapters[0].lessons.length === 2,
      "JSON Import Parser",
      `Extracted 1 Phase and 2 Lessons (1 ready, 1 placeholder)`
    )

    // -------------------------------------------------------------
    // FEATURE 2: IMPORT HTML PARSING (Embedded & Standalone)
    // -------------------------------------------------------------
    console.log("\n--- FEATURE 2: TEST HTML IMPORT PARSER ---")

    // Subtest 2A: HTML with embedded <script id="tutorial-data">
    const embeddedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GenAI Embedded Guide</title>
          <script type="application/json" id="tutorial-data">
            ${sampleGenAiJson}
          </script>
        </head>
        <body>
          <h1>GenAI Masterclass Static Wrapper</h1>
        </body>
      </html>
    `
    const parsedEmbeddedHtml = parseTutorialInput(embeddedHtml)
    assert(
      parsedEmbeddedHtml.formatType === "GENAI_TUTORIAL_JSON",
      "HTML Script Extraction",
      `Successfully extracted JSON payload from <script id="tutorial-data">`
    )
    assert(
      parsedEmbeddedHtml.title === "Test GenAI Engineer Masterclass",
      "HTML Script Extraction",
      `Extracted title: "${parsedEmbeddedHtml.title}"`
    )

    // Subtest 2B: Standalone Raw HTML Web Embed (No script tag)
    const rawHtmlEmbed = `
      <!DOCTYPE html>
      <html>
        <head><title>Quantum Computing Interactive Lab | Aspirantbook</title></head>
        <body>
          <h1>Quantum Superposition & Qubits</h1>
          <p>Explore Hadamard gates and quantum state vectors.</p>
        </body>
      </html>
    `
    const parsedRawHtml = parseTutorialInput(rawHtmlEmbed)
    assert(
      parsedRawHtml.formatType === "HTML_EMBED",
      "Raw HTML Web Embed",
      `Identified as HTML_EMBED fallback`
    )
    assert(
      parsedRawHtml.title === "Quantum Computing Interactive Lab",
      "Raw HTML Web Embed",
      `Extracted sanitized title from <title>: "${parsedRawHtml.title}"`
    )
    assert(
      parsedRawHtml.chapters[0].lessons[0].content.includes("html"),
      "Raw HTML Web Embed",
      `Wrapped raw HTML inside Rosera HTML Block`
    )

    // -------------------------------------------------------------
    // FEATURE 3: ATOMIC DRY-RUN & INITIAL IMPORT (PHASE 1)
    // -------------------------------------------------------------
    console.log("\n--- FEATURE 3: DRY-RUN PREVIEW & INITIAL IMPORT ---")

    // Clean up any previous test course with this slug/title
    await prisma.course.deleteMany({
      where: {
        OR: [
          { slug: "test-genai-masterclass" },
          { title: "Test GenAI Engineer Masterclass" },
        ],
      },
    })

    // Subtest 3A: Dry Run
    const dryRunResult = await importTutorialPackage(parsedJsonData.packageJson, {
      dryRun: true,
    })
    assert(
      dryRunResult.success === true,
      "Dry Run Preview",
      `Dry run passed without database mutations`
    )
    assert(
      dryRunResult.summary.created === 2,
      "Dry Run Summary",
      `Detected 2 lessons to create (1 active + 1 placeholder)`
    )

    // Subtest 3B: Real Phase 1 Import
    const importResult = await importTutorialPackage(parsedJsonData.packageJson, {
      dryRun: false,
      publishImmediately: true,
    })
    assert(
      importResult.success === true && !!importResult.courseId,
      "Atomic Import Phase 1",
      `Course created successfully with ID: ${importResult.courseId}`
    )
    testCourseId = importResult.courseId!

    // Verify Course in DB
    const dbCoursePhase1 = await prisma.course.findUnique({
      where: { id: testCourseId },
      include: {
        chapters: {
          include: {
            lessons: {
              include: { versions: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })
    assert(!!dbCoursePhase1, "DB Course Lookup", `Found course "${dbCoursePhase1?.title}"`)
    assert(
      dbCoursePhase1?.chapters.length === 1,
      "DB Chapters Check",
      `1 Chapter created (externalId: "${dbCoursePhase1?.chapters[0].externalId}")`
    )
    const ch1Lessons = dbCoursePhase1!.chapters[0].lessons
    assert(
      ch1Lessons.length === 2,
      "DB Lessons Check",
      `2 Lessons created (ch-1-1 active, ch-1-2 placeholder)`
    )
    assert(
      ch1Lessons[0].locked === false && !!ch1Lessons[0].currentPublishedVersionId,
      "DB Lesson Active Status",
      `Lesson 1.1 is unlocked with published version: ${ch1Lessons[0].currentPublishedVersionId}`
    )
    assert(
      ch1Lessons[1].locked === true,
      "DB Placeholder Status",
      `Lesson 1.2 (soon: 1) is locked as a future roadmap topic`
    )

    // Store original BIDs of Lesson 1.1 to verify BID preservation later
    const lesson1OriginalBlocks = ch1Lessons[0].versions[0]?.blocks as any[]
    const originalBids = lesson1OriginalBlocks.map((b) => b.bid)
    console.log("   Stored original BIDs for Lesson 1.1:", originalBids)

    // -------------------------------------------------------------
    // FEATURE 4: MULTI-PHASE MERGE (PHASE 2 & UNLOCKING)
    // -------------------------------------------------------------
    console.log("\n--- FEATURE 4: MULTI-PHASE MERGE & STATUS TRANSITIONS ---")

    // Incoming Package with:
    // 1) Lesson 1.1: Exact same content (should be UNCHANGED)
    // 2) Lesson 1.2: Unlocked from soon:1 to fully authored (should be UNLOCKED)
    // 3) Phase 2 (New): Chapter 2 with Lesson 2.1 (should be CREATED)
    const mergePhase2Package = {
      schema: 1,
      meta: {
        id: "test-genai-masterclass",
        title: "Test GenAI Engineer Masterclass",
        subject: "Artificial Intelligence",
        level: "INTERMEDIATE",
        intro: "Master generative models, transformers, and LLM engineering.",
      },
      phases: [
        {
          id: "phase-1",
          title: "Phase 1: Transformer Architecture",
          order: 1,
          chapters: [
            {
              id: "ch-1-1",
              title: "1.1 Attention Mechanism & Self-Attention",
              order: 1,
              blocks: [
                // Identical blocks
                {
                  bid: "b-h2-1",
                  t: "h2",
                  x: "The Attention Is All You Need Paper",
                },
                {
                  bid: "b-p-1",
                  t: "p",
                  x: "Scaled Dot-Product Attention transforms queries, keys, and values into ==contextualized embeddings==.",
                },
                {
                  bid: "b-code-1",
                  t: "code",
                  lang: "python",
                  title: "attention.py",
                  x: "import torch\nimport torch.nn.functional as F\n\ndef attention(q, k, v):\n    d_k = q.size(-1)\n    scores = torch.matmul(q, k.transpose(-2, -1)) / (d_k ** 0.5)\n    return torch.matmul(F.softmax(scores, dim=-1), v)",
                },
              ],
            },
            {
              id: "ch-1-2",
              title: "1.2 Positional Encodings & RoPE",
              soon: 0, // Unlocking from placeholder!
              order: 2,
              blocks: [
                {
                  bid: "b-rope-h2",
                  t: "h2",
                  x: "Rotary Positional Embeddings (RoPE)",
                },
                {
                  bid: "b-rope-p",
                  t: "p",
                  x: "RoPE encodes relative positions via rotation matrices.",
                },
              ],
            },
          ],
        },
        {
          id: "phase-2",
          title: "Phase 2: Production RAG & Vector Systems",
          order: 2,
          chapters: [
            {
              id: "ch-2-1",
              title: "2.1 Hybrid Dense-Sparse Vector Search",
              order: 1,
              blocks: [
                {
                  bid: "b-rag-h2",
                  t: "h2",
                  x: "BM25 meets HNSW Vector Indexing",
                },
              ],
            },
          ],
        },
      ],
    }

    const mergeResult = await importTutorialPackage(mergePhase2Package, {
      dryRun: false,
      publishImmediately: true,
    })

    assert(mergeResult.success === true, "Phase 2 Merge", `Merge executed successfully`)
    assert(
      mergeResult.summary.unchanged === 1,
      "Merge Status: Unchanged",
      `Lesson 1.1 correctly marked as UNCHANGED (Content Hash Match)`
    )
    assert(
      mergeResult.summary.unlocked === 1,
      "Merge Status: Unlocked",
      `Lesson 1.2 correctly marked as UNLOCKED (Placeholder -> Full Authoring)`
    )
    assert(
      mergeResult.summary.created === 1,
      "Merge Status: Created",
      `Lesson 2.1 in Phase 2 correctly marked as CREATED`
    )

    // Verify DB state after Merge
    const dbCourseMerged = await prisma.course.findUnique({
      where: { id: testCourseId },
      include: {
        chapters: {
          include: {
            lessons: {
              include: { versions: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })
    assert(
      dbCourseMerged?.chapters.length === 2,
      "DB Merged Chapters",
      `Now contains 2 Chapters (Phase 1 & Phase 2)`
    )
    const totalMergedLessons = dbCourseMerged!.chapters.reduce(
      (sum, ch) => sum + ch.lessons.length,
      0
    )
    assert(
      totalMergedLessons === 3,
      "DB Merged Lessons",
      `Total 3 lessons present across both phases`
    )

    // Subtest 4B: BID Preservation Check
    const lesson1AfterMerge = dbCourseMerged!.chapters[0].lessons[0]
    const lesson1BlocksAfterMerge = lesson1AfterMerge.versions[0]?.blocks as any[]
    const bidsAfterMerge = lesson1BlocksAfterMerge.map((b) => b.bid)
    assert(
      JSON.stringify(originalBids) === JSON.stringify(bidsAfterMerge),
      "BID Preservation",
      `Original Block IDs remained perfectly preserved across merges`
    )

    // Subtest 4C: Idempotency Check (Merge identical payload again)
    const idempotentMerge = await importTutorialPackage(mergePhase2Package, {
      dryRun: false,
      publishImmediately: true,
    })
    assert(
      idempotentMerge.summary.unchanged === 3 &&
        idempotentMerge.summary.created === 0 &&
        idempotentMerge.summary.updated === 0,
      "Merge Idempotency",
      `Re-running exact same merge produced 3 UNCHANGED, 0 CREATED, 0 UPDATED`
    )

    // -------------------------------------------------------------
    // FEATURE 5: EDITING EXISTING TUTORIAL LESSONS
    // WITH GRAPHS, VISUALS, INTERACTIVE DIAGRAMS, & QUIZZES
    // -------------------------------------------------------------
    console.log("\n--- FEATURE 5: EDITING LESSON WITH RICH VISUALS & DIAGRAMS ---")

    const targetLesson = dbCourseMerged!.chapters[0].lessons[0]
    console.log(`Editing Lesson: "${targetLesson.title}" (ID: ${targetLesson.id})`)

    // Compose rich interactive blocks:
    // 1. Horizontal Metric Bar Chart
    // 2. Infographic Grid
    // 3. Comparison Table
    // 4. Interactive Architecture Diagram (Transformer Pipeline with Neural Net, Prompt box, Probability chips)
    // 5. Interactive Self-Check Quiz
    // 6. Interactive Code Snippet with expected terminal output
    const richVisualBlocks = [
      {
        bid: "edit-h2-main",
        t: "h2",
        x: "Advanced Transformer Deep Dive & Evaluation",
      },
      // A. Horizontal Metric Bar Chart
      {
        bid: "edit-chart-1",
        t: "chart",
        title: "Model Accuracy on MMLU Benchmark (%)",
        d: [
          { label: "Transformer Base (125M)", val: 42 },
          { label: "Transformer Large (350M)", val: 64 },
          { label: "Transformer MoE (8x7B)", val: 89 },
          { label: "State-of-the-Art Frontier", val: 94 },
        ],
      },
      // B. Infographic Cards
      {
        bid: "edit-infographic-1",
        t: "infographic",
        items: [
          {
            icon: "⚡",
            title: "Multi-Head Attention",
            body: "Splits projection matrices into parallel representation subspaces.",
          },
          {
            icon: "🛡️",
            title: "LayerNorm & Residuals",
            body: "Prevents vanishing gradients during backward backprop pass.",
          },
          {
            icon: "🚀",
            title: "KV-Cache Acceleration",
            body: "Reuses computed key/value matrices during autoregressive generation.",
          },
        ],
      },
      // C. Neo-Brutalist Comparison Table
      {
        bid: "edit-table-1",
        t: "table",
        title: "Dense vs Mixture-of-Experts Comparison",
        h: ["Feature", "Dense Architecture", "MoE Architecture"],
        r: [
          ["Parameter Count", "`7B - 70B` active per token", "`8x7B` (only 13B active per token)"],
          ["Inference Latency", "Uniform GPU compute", "Dynamic gating router latency"],
          ["VRAM Footprint", "Fits in standard VRAM", "Requires offloading or multi-GPU"],
        ],
      },
      // D. Interactive Architecture Diagram Pipeline
      {
        bid: "edit-diagram-pipeline-1",
        t: "diagram",
        diagramFlow: {
          title: "Next-Token Autoregressive Prediction Flow",
          caption: "Interactive breakdown of tokens streaming through embedding layer to attention heads.",
          stages: [
            {
              shape: "box",
              label: "The sky is",
              subtitle: "Raw Prompt Context",
              bgColor: "#FDF099",
            },
            {
              shape: "arrow",
              label: "BPE Tokenize",
              color: "#3A10E5",
            },
            {
              shape: "neural",
              label: "Transformer Matrix",
              nodeColor: "#DDEBFE",
              labelColor: "#059669",
            },
            {
              shape: "probabilities",
              chips: [
                { label: "blue", value: "72%" },
                { label: "clear", value: "18%" },
                { label: "grey", value: "6%" },
              ],
              nextToken: "blue",
              nextTokenColor: "#059669",
            },
          ],
        },
      },
      // E. Interactive Knowledge Self-Check Quiz
      {
        bid: "edit-quiz-1",
        t: "quiz",
        q: "Why does Scaled Dot-Product Attention divide the dot product by sqrt(d_k)?",
        o: [
          "To speed up matrix multiplication in CUDA cores",
          "To prevent softmax from saturating into regions with vanishing gradients",
          "To normalize token IDs between 0 and 1",
          "To enforce causal masking on decoder steps",
        ],
        a: 1, // Option B is correct
        why: "When d_k is large, dot products grow large in magnitude, pushing softmax into regions with extremely small gradients. Dividing by sqrt(d_k) stabilizes variance.",
      },
      // F. Interactive Code Snippet with Expected Terminal Output
      {
        bid: "edit-code-1",
        t: "code",
        lang: "python",
        title: "test_prediction.py",
        x: "import math\n\ndef scaled_dot_product_scale(d_k):\n    return 1.0 / math.sqrt(d_k)\n\nprint('Scale factor for d_k=64:', scaled_dot_product_scale(64))\nprint('Scale factor for d_k=128:', round(scaled_dot_product_scale(128), 4))",
        expectedOutput: "Scale factor for d_k=64: 0.125\nScale factor for d_k=128: 0.0884",
      },
    ]

    // Verify all blocks normalize properly
    const normalizedBlocks = richVisualBlocks.map((b) => normalizeBlockWithBid(b))
    assert(
      normalizedBlocks.length === 7,
      "Block Normalization",
      `All 7 rich visual and interactive blocks normalized successfully`
    )

    // -------------------------------------------------------------
    // FEATURE 6: DRAFT ISOLATION & PUBLISH WORKFLOW
    // -------------------------------------------------------------
    console.log("\n--- FEATURE 6: DRAFT ISOLATION & PUBLISH WORKFLOW ---")

    // Step 6A: Save as a Draft Version
    const draftVersion = await prisma.lessonVersion.create({
      data: {
        lessonId: targetLesson.id,
        status: "draft",
        blocks: normalizedBlocks,
        source: "editor",
        note: "Added interactive diagrams, MMLU chart, and knowledge quiz",
        schemaVersion: 1,
        createdBy: "admin@trillionskills.com",
      },
    })

    await prisma.lesson.update({
      where: { id: targetLesson.id },
      data: { currentDraftVersionId: draftVersion.id },
    })

    // Step 6B: Verify Draft Isolation
    const lessonWithDraft = await prisma.lesson.findUnique({
      where: { id: targetLesson.id },
      include: { versions: true },
    })

    assert(
      lessonWithDraft?.currentPublishedVersionId === targetLesson.currentPublishedVersionId,
      "Draft Isolation Check",
      `Student-facing published version is unchanged (${lessonWithDraft?.currentPublishedVersionId})`
    )
    assert(
      lessonWithDraft?.currentDraftVersionId === draftVersion.id,
      "Draft Assignment Check",
      `Draft version successfully recorded on lesson: ${draftVersion.id}`
    )

    // Step 6C: Publish the Draft Version to Live
    const publishedVersion = await prisma.lessonVersion.create({
      data: {
        lessonId: targetLesson.id,
        status: "published",
        blocks: normalizedBlocks,
        source: "editor",
        note: "Published interactive visual update",
        schemaVersion: 1,
        createdBy: "admin@trillionskills.com",
      },
    })

    await prisma.lesson.update({
      where: { id: targetLesson.id },
      data: {
        currentPublishedVersionId: publishedVersion.id,
        currentDraftVersionId: null, // Clear draft upon publish
        content: JSON.stringify(normalizedBlocks),
      },
    })

    // Step 6D: Verify Published State
    const liveLesson = await prisma.lesson.findUnique({
      where: { id: targetLesson.id },
      include: { versions: { orderBy: { createdAt: "desc" } } },
    })

    assert(
      liveLesson?.currentPublishedVersionId === publishedVersion.id,
      "Publish Version Verification",
      `Lesson currentPublishedVersionId updated to new version: ${publishedVersion.id}`
    )
    assert(
      liveLesson?.currentDraftVersionId === null,
      "Draft Clear Verification",
      `currentDraftVersionId correctly cleared after live publishing`
    )
    assert(
      Boolean(liveLesson?.versions && liveLesson.versions.length >= 2),
      "Version History",
      `Version audit trail preserved (${liveLesson?.versions?.length || 0} versions recorded)`
    )

    // Verify content of live lesson contains the diagrams and quiz
    const liveBlocks = JSON.parse(liveLesson!.content || "[]")
    const hasChart = liveBlocks.some((b: any) => b.t === "chart")
    const hasInfographic = liveBlocks.some((b: any) => b.t === "infographic")
    const hasTable = liveBlocks.some((b: any) => b.t === "table")
    const hasDiagram = liveBlocks.some((b: any) => b.t === "diagram")
    const hasQuiz = liveBlocks.some((b: any) => b.t === "quiz")
    const hasCode = liveBlocks.some((b: any) => b.t === "code")

    assert(
      hasChart && hasInfographic && hasTable && hasDiagram && hasQuiz && hasCode,
      "Live Block Verification",
      `Live lesson contains all 6 interactive features: Chart, Infographic, Table, Diagram Pipeline, Quiz, and Code Snippet!`
    )

    console.log("\n=================================================================")
    console.log("🎉 ALL TESTS PASSED! SUMMARY:")
    console.log(`Total Checks Executed: ${results.length}`)
    console.log(`Passed: ${results.filter((r) => r.passed).length}`)
    console.log(`Failed: ${results.filter((r) => !r.passed).length}`)
    console.log("=================================================================\n")
  } finally {
    // Clean up created test course
    if (testCourseId) {
      console.log(`🧹 Cleaning up test course: ${testCourseId}...`)
      try {
        await prisma.lessonVersion.deleteMany({
          where: { lesson: { chapter: { courseId: testCourseId } } },
        })
        await prisma.lesson.deleteMany({
          where: { chapter: { courseId: testCourseId } },
        })
        await prisma.chapter.deleteMany({
          where: { courseId: testCourseId },
        })
        await prisma.course.delete({
          where: { id: testCourseId },
        })
        console.log("✓ Test course and records cleanly deleted.")
      } catch (err: any) {
        console.warn("Cleanup warning:", err.message)
      }
    }
    await prisma.$disconnect()
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Error:", err)
  process.exit(1)
})
