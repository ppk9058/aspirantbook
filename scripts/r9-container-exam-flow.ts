/**
 * R9-S4: full exam flow against a running server (the production container).
 *
 * Uses only the app's real /api/v1 routes:
 *   register -> login -> list tests -> start attempt -> read questions
 *   -> sync answers -> submit -> result
 *
 * Usage: R9_BASE_URL=http://127.0.0.1:3050 npx tsx scripts/r9-container-exam-flow.ts
 * Prints step statuses and ids only. No credentials are printed.
 */
import crypto from "node:crypto";

const BASE = (process.env.R9_BASE_URL || "http://127.0.0.1:3050").replace(/\/$/, "");

type Json = Record<string, any>;

let step = 0;
function log(name: string, detail: string) {
  step += 1;
  console.log(`[${step}] ${name}: ${detail}`);
}

async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; json: Json; headers: Headers }> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let json: Json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, headers: res.headers };
}

function must(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function main() {
  const runId = `${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const email = `r9_container_${runId}@internal.test`;
  const password = `R9_${crypto.randomUUID()}_aA1!`;

  const health = await call("GET", "/api/health");
  must(health.status === 200, `health returned ${health.status}`);
  log("health", `status=${health.status} db=${health.json?.database?.status}`);

  const register = await call("POST", "/api/v1/auth/register", {
    body: { name: "R9 Container Candidate", email, password, consent: true, platform: "web" },
  });
  must(register.status === 201, `register returned ${register.status}: ${JSON.stringify(register.json).slice(0, 200)}`);
  const registerToken = register.json?.data?.tokens?.accessToken;
  must(typeof registerToken === "string" && registerToken.length > 20, "register returned no access token");
  log("register", `status=${register.status} userId=${register.json?.data?.user?.id}`);

  const login = await call("POST", "/api/v1/auth/login", {
    body: { email, password, platform: "web" },
  });
  must(login.status === 200, `login returned ${login.status}`);
  const token = login.json?.data?.tokens?.accessToken;
  must(typeof token === "string" && token.length > 20, "login returned no access token");
  log("login", `status=${login.status}`);

  const list = await call("GET", "/api/v1/tests?limit=20", { token });
  must(list.status === 200, `tests list returned ${list.status}`);
  const items: Json[] = list.json?.data?.items || list.json?.data || [];
  must(Array.isArray(items) && items.length > 0, "tests list is empty");

  const candidate =
    items.find((t) => t.isFree === true && Number(t.totalQuestions) > 0) ||
    items.find((t) => Number(t.totalQuestions) > 0);
  must(candidate?.id, "no test with questions available");
  log("tests", `count=${items.length} chosen=${candidate.id} free=${candidate.isFree}`);

  const start = await call("POST", `/api/v1/tests/${candidate.id}/attempts`, { token, body: {} });
  must(start.status === 201 || start.status === 200, `start returned ${start.status}: ${JSON.stringify(start.json).slice(0, 200)}`);
  const attemptId = start.json?.data?.attemptId;
  must(typeof attemptId === "string" && attemptId.length > 5, "start returned no attemptId");
  log("start", `status=${start.status} attemptId=${attemptId} resumed=${start.json?.data?.resumed}`);

  const detail = await call("GET", `/api/v1/attempts/${attemptId}`, { token });
  must(detail.status === 200, `attempt detail returned ${detail.status}`);
  const questions: Json[] = detail.json?.data?.questions || [];
  must(questions.length > 0, "attempt detail returned no questions");
  log("questions", `count=${questions.length} status=${detail.json?.data?.status}`);

  const answerCount = Math.min(3, questions.length);
  const answers = questions.slice(0, answerCount).map((q, idx) => ({
    questionId: q.id,
    selectedOption: "A",
    isMarked: false,
    timeSpentSecs: 5,
    sequenceNumber: idx + 1,
  }));

  const sync = await call("PUT", `/api/v1/attempts/${attemptId}/answers`, {
    token,
    body: { answers, lastSequenceNumber: answerCount },
  });
  must(sync.status === 200, `answer sync returned ${sync.status}: ${JSON.stringify(sync.json).slice(0, 200)}`);
  log("answers", `status=${sync.status} synced=${sync.json?.data?.syncedCount ?? sync.json?.data?.accepted ?? answerCount}`);

  const submit = await call("POST", `/api/v1/attempts/${attemptId}/submit`, {
    token,
    body: { finalAnswers: answers },
  });
  must(submit.status === 200, `submit returned ${submit.status}: ${JSON.stringify(submit.json).slice(0, 200)}`);
  log("submit", `status=${submit.status}`);

  const result = await call("GET", `/api/v1/attempts/${attemptId}/result`, { token });
  must(result.status === 200, `result returned ${result.status}`);
  const r = result.json?.data || {};
  must(typeof r.score === "number", "result has no numeric score");
  must(typeof r.totalMarks === "number", "result has no totalMarks");
  log(
    "result",
    `status=${result.status} score=${r.score} totalMarks=${r.totalMarks} correct=${r.correctCount} wrong=${r.wrongCount} skipped=${r.skippedCount}`
  );

  console.log("EXAM_FLOW_PASS");
}

main().catch((err) => {
  console.error("EXAM_FLOW_FAIL:", err?.message || err);
  process.exit(1);
});
