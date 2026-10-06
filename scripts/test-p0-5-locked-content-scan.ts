import { PrismaClient, Difficulty, LessonType } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { assertTestDb } from "../lib/testing/assert-test-db";

const dbUrl = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = dbUrl;
process.env.DIRECT_URL = dbUrl;
assertTestDb();

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3045";
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "default_test_secret_32_characters_long_min";

async function createSessionCookie(userId: string, role: string, email: string) {
  const token = await encode({
    token: { id: userId, role, email, name: `User ${role}` },
    secret: SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${token}`;
}

async function main() {
  console.log("TEST DB: yes | host: 127.0.0.1:54329 | db: trillionskill_test");
  console.log("BASE_URL:", BASE_URL);

  // Setup seed data for locked content scan
  // Users:
  // 1. anonymous (no cookie)
  // 2. FREE user (u_student_free_p9)
  // 3. PREMIUM user (u_student_prem_p9)
  // 4. TEACHER owner (u_teacher_owner_p9)
  // 5. TEACHER other (u_teacher_other_p9)
  // 6. ADMIN (u_admin_p9)
  // 7. Enrolled in other course (u_student_courseB_p9)

  const cookies: Record<string, string> = {
    anonymous: "",
    FREE: await createSessionCookie("u_student_free_p9", "FREE", "student_free@p9.local"),
    PREMIUM: await createSessionCookie("u_student_prem_p9", "PREMIUM", "student_prem@p9.local"),
    TEACHER_OWNER: await createSessionCookie("u_teacher_owner_p9", "TEACHER", "teacher_owner@p9.local"),
    TEACHER_OTHER: await createSessionCookie("u_teacher_other_p9", "TEACHER", "teacher_other@p9.local"),
    ADMIN: await createSessionCookie("u_admin_p9", "ADMIN", "admin@p9.local"),
    ENROLLED_OTHER: await createSessionCookie("u_student_courseB_p9", "FREE", "student_courseB@p9.local"),
  };

  // Lessons:
  // Locked: l_a_locked_p9 (videoUrl: "https://stream.example.com/super-secret-video-stream.m3u8")
  // Trial: l_a_trial_p9 (videoUrl: "https://stream.example.com/trial-video-sample.m3u8")

  const SENSITIVE_PATTERNS = [
    "super-secret-video-stream",
    "videoUrl",
    "hlsUrl",
    "muxPlaybackId",
    "t.me/",
    "telegram.me",
  ];

  const results: Array<{
    persona: string;
    lessonType: "TRIAL" | "LOCKED";
    surface: "HTML" | "RSC" | "API";
    url: string;
    status: number;
    sizeBytes: number;
    leakYesNo: "LEAK" | "SECURE" | "EXPECTED_ALLOWED";
    detectedTokens: string[];
  }> = [];

  const personas = ["anonymous", "FREE", "PREMIUM", "TEACHER_OWNER", "TEACHER_OTHER", "ADMIN", "ENROLLED_OTHER"];
  const lessonIds = [
    { type: "TRIAL" as const, id: "l_a_trial_p9", path: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_trial_p9" },
    { type: "LOCKED" as const, id: "l_a_locked_p9", path: "/courses/72nd-bpsc-prelims-current-affairs/learn/l_a_locked_p9" },
  ];

  for (const p of personas) {
    const cookie = cookies[p];
    const baseHeaders: Record<string, string> = {};
    if (cookie) baseHeaders["Cookie"] = cookie;

    for (const l of lessonIds) {
      // 1. HTML surface
      const htmlRes = await fetch(`${BASE_URL}${l.path}`, {
        headers: { ...baseHeaders, "Accept": "text/html" },
        redirect: "manual",
      });
      const htmlText = await htmlRes.text();
      const detectedHtml = SENSITIVE_PATTERNS.filter(pat => htmlText.includes(pat));
      
      const isEntitled = (p === "ADMIN" || p === "TEACHER_OWNER" || p === "TEACHER_OTHER" || p === "PREMIUM");
      let leakVerdict: "LEAK" | "SECURE" | "EXPECTED_ALLOWED" = "SECURE";

      if (l.type === "LOCKED") {
        if (!isEntitled) {
          leakVerdict = detectedHtml.length > 0 ? "LEAK" : "SECURE";
        } else {
          leakVerdict = "EXPECTED_ALLOWED";
        }
      } else {
        // Trial lesson is meant to preview video
        leakVerdict = "EXPECTED_ALLOWED";
      }

      results.push({
        persona: p,
        lessonType: l.type,
        surface: "HTML",
        url: l.path,
        status: htmlRes.status,
        sizeBytes: htmlText.length,
        leakYesNo: leakVerdict,
        detectedTokens: detectedHtml,
      });

      // 2. RSC surface
      const rscRes = await fetch(`${BASE_URL}${l.path}?_rsc=pass9test`, {
        headers: { ...baseHeaders, "RSC": "1" },
        redirect: "manual",
      });
      const rscText = await rscRes.text();
      const detectedRsc = SENSITIVE_PATTERNS.filter(pat => rscText.includes(pat));
      let leakVerdictRsc: "LEAK" | "SECURE" | "EXPECTED_ALLOWED" = "SECURE";

      if (l.type === "LOCKED") {
        if (!isEntitled) {
          leakVerdictRsc = detectedRsc.length > 0 ? "LEAK" : "SECURE";
        } else {
          leakVerdictRsc = "EXPECTED_ALLOWED";
        }
      } else {
        leakVerdictRsc = "EXPECTED_ALLOWED";
      }

      results.push({
        persona: p,
        lessonType: l.type,
        surface: "RSC",
        url: `${l.path}?_rsc=1`,
        status: rscRes.status,
        sizeBytes: rscText.length,
        leakYesNo: leakVerdictRsc,
        detectedTokens: detectedRsc,
      });

      // 3. API surface (/api/courses/72nd-bpsc-prelims-current-affairs/lessons/[id])
      const apiPath = `/api/courses/72nd-bpsc-prelims-current-affairs/lessons/${l.id}`;
      const apiRes = await fetch(`${BASE_URL}${apiPath}`, {
        headers: { ...baseHeaders },
        redirect: "manual",
      });
      const apiText = await apiRes.text();
      const detectedApi = SENSITIVE_PATTERNS.filter(pat => apiText.includes(pat));
      let leakVerdictApi: "LEAK" | "SECURE" | "EXPECTED_ALLOWED" = "SECURE";

      if (l.type === "LOCKED") {
        if (!isEntitled) {
          leakVerdictApi = detectedApi.length > 0 ? "LEAK" : "SECURE";
        } else {
          leakVerdictApi = "EXPECTED_ALLOWED";
        }
      } else {
        leakVerdictApi = "EXPECTED_ALLOWED";
      }

      results.push({
        persona: p,
        lessonType: l.type,
        surface: "API",
        url: apiPath,
        status: apiRes.status,
        sizeBytes: apiText.length,
        leakYesNo: leakVerdictApi,
        detectedTokens: detectedApi,
      });
    }
  }

  console.log("\n==========================================================================================");
  console.log("=== P0-5 LOCKED CONTENT SCAN RESULTS ===");
  console.log("==========================================================================================");
  console.log(
    "| Persona | Lesson Type | Surface | HTTP | Bytes | Verdict | Leaked Tokens |"
  );
  console.log(
    "|---------|-------------|---------|------|-------|---------|---------------|"
  );
  for (const r of results) {
    console.log(
      `| ${r.persona.padEnd(14)} | ${r.lessonType.padEnd(7)} | ${r.surface.padEnd(5)} | ${String(r.status).padEnd(4)} | ${String(r.sizeBytes).padEnd(6)} | ${r.leakYesNo.padEnd(16)} | ${r.detectedTokens.join(",") || "NONE"} |`
    );
  }

  // RSC Over-fetch comparison: Enrolled vs Unenrolled
  const freeLockedRsc = results.find(r => r.persona === "FREE" && r.lessonType === "LOCKED" && r.surface === "RSC")?.sizeBytes || 0;
  const premLockedRsc = results.find(r => r.persona === "PREMIUM" && r.lessonType === "LOCKED" && r.surface === "RSC")?.sizeBytes || 0;

  console.log("\n--- RSC PAYLOAD OVER-FETCH MEASUREMENT ---");
  console.log(`Unenrolled (FREE) Locked Lesson RSC payload size: ${freeLockedRsc} bytes`);
  console.log(`Entitled (PREMIUM) Locked Lesson RSC payload size: ${premLockedRsc} bytes`);
  console.log(`Payload reduction for locked user: ${Math.max(0, premLockedRsc - freeLockedRsc)} bytes spared from unentitled learner`);

  const anyLeaks = results.some(r => r.leakYesNo === "LEAK");
  console.log("\nANY UNAUTHORIZED LEAKS FOUND:", anyLeaks ? "YES (FAIL)" : "NO (PASS)");
  if (anyLeaks) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
