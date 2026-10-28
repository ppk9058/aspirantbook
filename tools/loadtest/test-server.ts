import http from "http";
import { PrismaClient } from "@prisma/client";
import { gradeExamAttempt } from "../../lib/exam-grading";
import { getAttemptRanking, getTestRankings } from "../../lib/exam-ranking";
import { getSanitizedQuestionSet } from "../../lib/exam-questions-cache";
import { isExamBatchSyncEnabled, isExamFastGradingEnabled, isExamCacheQuestionsEnabled, isExamCacheLeaderboardEnabled } from "../../lib/exam-flags";

process.env.DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;

const prisma = new PrismaClient();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3045;

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: http.ServerResponse, status: number, data: any) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1:3045"}`);
  const pathname = url.pathname;
  const method = req.method;

  // Extract simulated or real user
  const userId = (req.headers["x-user-id"] as string) || "u_perf_p0_student";

  try {
    // 1. Healthcheck
    if (pathname === "/api/health") {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      return sendJson(res, 200, {
        status: "ok",
        uptime: process.uptime(),
        database: "healthy",
        latencyMs: Date.now() - start,
        flags: {
          batchSync: isExamBatchSyncEnabled(),
          fastGrading: isExamFastGradingEnabled(),
          cacheQuestions: isExamCacheQuestionsEnabled(),
          cacheLeaderboard: isExamCacheLeaderboardEnabled(),
        },
      });
    }

    // 2. Exam Start (POST /api/exam/attempt/start)
    if (method === "POST" && pathname === "/api/exam/attempt/start") {
      const body = await parseJsonBody(req);
      const { testId = "et_perf_100q" } = body;

      const useQuestionsCache = isExamCacheQuestionsEnabled();
      let test: any = null;

      if (useQuestionsCache) {
        test = await prisma.examTest.findUnique({
          where: { id: testId },
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            totalMarks: true,
            totalQuestions: true,
            positiveMarks: true,
            negativeMarks: true,
            isPublished: true,
            seriesId: true,
          },
        });
        if (test) {
          const qSet = await getSanitizedQuestionSet(test.id);
          test.sections = qSet?.sections ?? [];
        }
      } else {
        test = await prisma.examTest.findUnique({
          where: { id: testId },
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            totalMarks: true,
            totalQuestions: true,
            positiveMarks: true,
            negativeMarks: true,
            isPublished: true,
            seriesId: true,
            sections: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                questions: {
                  orderBy: { order: "asc" },
                  select: { id: true, questionEn: true, optionAEn: true, optionBEn: true, optionCEn: true, optionDEn: true },
                },
              },
            },
          },
        });
      }

      if (!test) return sendJson(res, 404, { error: "Test not found" });

      const attempt = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ":" + test.id}))`;
        return tx.examAttempt.create({
          data: {
            userId,
            testId: test.id,
            language: "English",
            status: "IN_PROGRESS",
          },
          select: { id: true, startedAt: true, testId: true },
        });
      });

      return sendJson(res, 201, {
        data: {
          attemptId: attempt.id,
          startedAt: attempt.startedAt,
          testId: attempt.testId,
          test,
        },
      });
    }

    // 3. Answer Sync (POST /api/exam/attempt/:attemptId/sync)
    const syncMatch = pathname.match(/^\/api\/exam\/attempt\/([^/]+)\/sync$/);
    if (method === "POST" && syncMatch) {
      const attemptId = syncMatch[1];
      const body = await parseJsonBody(req);
      const { answers = [], sequence = 1, tabSwitchCount } = body;

      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, userId: true, status: true },
      });
      if (!attempt) return sendJson(res, 404, { error: "Attempt not found" });

      if (isExamBatchSyncEnabled()) {
        const questionIds = answers.map((a: any) => a.questionId);
        const existingRows = await prisma.examAttemptAnswer.findMany({
          where: { attemptId, questionId: { in: questionIds } },
          select: { questionId: true, clientSeq: true },
        });

        const stale = existingRows.filter((r) => r.clientSeq !== null && r.clientSeq > sequence);
        if (stale.length > 0) {
          const maxStoredSeq = Math.max(...stale.map((r) => r.clientSeq!));
          return sendJson(res, 409, { error: "Stale sequence", storedSeq: maxStoredSeq });
        }

        const ids = answers.map((_: any, idx: number) => `ans_${attemptId}_${idx}_${Date.now()}`);
        const qIds = answers.map((a: any) => a.questionId);
        const options = answers.map((a: any) => a.selectedOption);
        const markeds = answers.map((a: any) => a.isMarked ?? false);
        const seqs = answers.map(() => sequence);
        const times = answers.map((a: any) => a.timeSpentSecs ?? 0);

        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`
            INSERT INTO "ExamAttemptAnswer" ("id", "attemptId", "questionId", "selectedOption", "isMarked", "clientSeq", "timeSpentSecs")
            SELECT
              v.id,
              ${attemptId},
              v.question_id,
              v.selected_option,
              v.is_marked,
              v.client_seq,
              v.time_spent_secs
            FROM UNNEST(
              ${ids}::text[],
              ${qIds}::text[],
              ${options}::text[],
              ${markeds}::boolean[],
              ${seqs}::int[],
              ${times}::int[]
            ) AS v(id, question_id, selected_option, is_marked, client_seq, time_spent_secs)
            ON CONFLICT ("attemptId", "questionId")
            DO UPDATE SET
              "selectedOption" = EXCLUDED."selectedOption",
              "isMarked" = EXCLUDED."isMarked",
              "clientSeq" = EXCLUDED."clientSeq",
              "timeSpentSecs" = EXCLUDED."timeSpentSecs"
            WHERE "ExamAttemptAnswer"."clientSeq" IS NULL
               OR EXCLUDED."clientSeq" >= "ExamAttemptAnswer"."clientSeq";
          `;

          if (typeof tabSwitchCount === "number") {
            await tx.examAttempt.update({ where: { id: attemptId }, data: { tabSwitchCount } });
          }
        });
      } else {
        // Legacy path (1-by-1 findUnique + upsert in loop)
        await prisma.$transaction(async (tx) => {
          for (const ans of answers) {
            await tx.examAttemptAnswer.upsert({
              where: { attemptId_questionId: { attemptId, questionId: ans.questionId } },
              create: {
                attemptId,
                questionId: ans.questionId,
                selectedOption: ans.selectedOption,
                isMarked: ans.isMarked ?? false,
                clientSeq: sequence,
                timeSpentSecs: ans.timeSpentSecs ?? 0,
              },
              update: {
                selectedOption: ans.selectedOption,
                isMarked: ans.isMarked ?? false,
                clientSeq: sequence,
                timeSpentSecs: ans.timeSpentSecs ?? 0,
              },
            });
          }
        });
      }

      return sendJson(res, 200, { data: { synced: true, count: answers.length } });
    }

    // 4. Submit (POST /api/exam/attempt/:attemptId/submit)
    const submitMatch = pathname.match(/^\/api\/exam\/attempt\/([^/]+)\/submit$/);
    if (method === "POST" && submitMatch) {
      const attemptId = submitMatch[1];
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, status: true, testId: true },
      });
      if (!attempt) return sendJson(res, 404, { error: "Attempt not found" });

      const graded = await gradeExamAttempt(attemptId, new Date());
      return sendJson(res, 200, { data: graded });
    }

    // 5. Result (GET /api/exam/attempt/:attemptId/result)
    const resultMatch = pathname.match(/^\/api\/exam\/attempt\/([^/]+)\/result$/);
    if (method === "GET" && resultMatch) {
      const attemptId = resultMatch[1];
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, testId: true, score: true, totalMarks: true, correctCount: true, wrongCount: true, skippedCount: true },
      });
      if (!attempt) return sendJson(res, 404, { error: "Attempt not found" });

      const ranking = await getAttemptRanking(attemptId);
      return sendJson(res, 200, { data: { ...attempt, ranking } });
    }

    // 6. Leaderboard (GET /api/exam/:testId/leaderboard)
    const lbMatch = pathname.match(/^\/api\/exam\/([^/]+)\/leaderboard$/);
    if (method === "GET" && lbMatch) {
      const testId = lbMatch[1];
      const rankings = await getTestRankings(testId);
      return sendJson(res, 200, {
        data: {
          testId,
          totalCandidates: rankings.totalCandidates,
          top10: rankings.rankedAttempts.slice(0, 10),
        },
      });
    }

    return sendJson(res, 404, { error: "Route not found" });
  } catch (err: any) {
    console.error("[TestServer Error]", err?.message || err);
    return sendJson(res, 500, { error: err?.message || "Internal server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[TestServer] High-performance exam runtime server listening on http://127.0.0.1:${PORT}`);
  console.log(`[TestServer] Flags: batchSync=${isExamBatchSyncEnabled()}, fastGrading=${isExamFastGradingEnabled()}, cacheQuestions=${isExamCacheQuestionsEnabled()}, cacheLeaderboard=${isExamCacheLeaderboardEnabled()}`);
});

process.on("SIGTERM", () => {
  server.close(() => prisma.$disconnect());
});
