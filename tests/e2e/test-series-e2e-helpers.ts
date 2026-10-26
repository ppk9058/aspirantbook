import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { assertTestDatabase } from "../../lib/test-db-guard";

// Fail closed: this helper is imported by every e2e spec, so a run pointed at
// any database other than the Docker test DB aborts before Prisma connects.
const TEST_DATABASE_URL = assertTestDatabase({ context: "tests/e2e/test-series-e2e-helpers.ts" });

import { DEFAULT_TEST_PASSWORD } from "../support/test-credentials";

export const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
export const PASSWORD = DEFAULT_TEST_PASSWORD;

export function newNonce() {
  return `E2E-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slugFor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createActor(nonce: string, role: UserRole, label: string) {
  const password = await bcrypt.hash(PASSWORD, 10);
  const email = `${slugFor(nonce)}-${label}@test.local`;
  return prisma.user.create({
    data: { email, name: `${nonce} ${label}`, password, role, selectedGoal: "bpsc" },
  });
}

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045";

export async function loginAs(page: Page, email: string, password = PASSWORD) {
  // Clear any existing session cookies
  await page.context().clearCookies();

  let loginRes: Response | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
      const { csrfToken } = await csrfRes.json();
      const csrfCookies = csrfRes.headers.getSetCookie();

      loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": csrfCookies.join("; "),
        },
        body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
        redirect: "manual",
      });
      if (loginRes.ok || loginRes.status === 302) {
        break;
      }
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  if (!loginRes) {
    throw new Error(`Failed to contact credentials callback for ${email}`);
  }

  const sessionCookies = loginRes.headers.getSetCookie();
  const tokenCookie = sessionCookies.find(
    (c) => c.startsWith("authjs.session-token=") || c.startsWith("__Secure-authjs.session-token=")
  );
  if (!tokenCookie) {
    throw new Error(`Failed to obtain authjs.session-token for ${email} (status ${loginRes.status})`);
  }

  const [cookieKeyVal] = tokenCookie.split(";");
  const [cookieName, tokenVal] = cookieKeyVal.split("=");
  const urlObj = new URL(BASE);
  const cookieDomain = urlObj.hostname;

  await page.context().addCookies([
    {
      name: cookieName,
      value: tokenVal,
      domain: cookieDomain,
      path: "/",
      httpOnly: true,
      secure: cookieName.startsWith("__Secure-"),
      sameSite: "Lax",
    },
  ]);

  // Verify session via page.request using the newly authenticated cookie
  const sessionRes = await page.request.get(`${BASE}/api/auth/session`, {
    headers: { "Cookie": `${cookieName}=${tokenVal}` },
  });
  const session = sessionRes.ok() ? await sessionRes.json() : null;

  if (!session?.user?.email || session.user.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error(`loginAs failed: session user ${session?.user?.email} does not match expected ${email}`);
  }

  return session;
}

export async function loginThroughUi(page: Page, email: string) {
  return loginAs(page, email);
}

export async function beginArtifacts(context: BrowserContext) {
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
}

export async function saveArtifacts(page: Page, context: BrowserContext, info: TestInfo) {
  const root = path.resolve(process.cwd(), "logs/verify-studio/e2e");
  await fs.mkdir(root, { recursive: true });
  const artifactBase = path.join(root, `${slugFor(info.title)}-${info.project.name}`);
  await page.screenshot({ path: `${artifactBase}.png`, fullPage: true }).catch(() => undefined);
  await context.tracing.stop({ path: `${artifactBase}.trace.zip` }).catch(() => undefined);
}

export async function cleanupNonce(nonce: string) {
  const titleNeedle = nonce;
  const emailNeedle = slugFor(nonce);
  await prisma.examSeries.deleteMany({ where: { title: { contains: titleNeedle } } });
  await prisma.user.deleteMany({ where: { email: { contains: emailNeedle } } });
}

export function questionFixture(nonce: string, index: number, correct: "A" | "B" | "C" | "D") {
  return {
    questionEn: `${nonce} Question ${index}: Which answer matches fixture ${index}?`,
    optionAEn: `${nonce} ${index} option A`,
    optionBEn: `${nonce} ${index} option B`,
    optionCEn: `${nonce} ${index} option C`,
    optionDEn: `${nonce} ${index} option D`,
    correctOption: correct,
    explanationEn: `${nonce} explanation ${index}`,
    positiveMarks: 1,
    negativeMarks: 0.25,
  };
}

export async function seedSeriesWithTest({
  nonce,
  ownerId,
  published = true,
  accessMode = "FREE",
  questionCount = 10,
  durationMinutes = 30,
}: {
  nonce: string;
  ownerId: string;
  published?: boolean;
  accessMode?: "FREE" | "PRO";
  questionCount?: number;
  durationMinutes?: number;
}) {
  const slug = slugFor(nonce);
  const series = await prisma.examSeries.create({
    data: {
      title: `${nonce} BPSC Test Series`, slug, examName: `${nonce} BPSC`, category: "BPSC",
      isPublished: published, isFree: accessMode === "FREE", isPro: accessMode === "PRO",
      createdById: ownerId,
    },
  });
  const test = await prisma.examTest.create({
    data: {
      seriesId: series.id, title: `${nonce} ${accessMode} Test`, testType: "FULL_MOCK",
      accessMode, durationMinutes, totalQuestions: questionCount, totalMarks: questionCount,
      positiveMarks: 1, negativeMarks: 0.25, isPublished: published, createdById: ownerId,
      sections: {
        create: [{
          title: `${nonce} General Studies`, order: 1, positiveMarks: 1, negativeMarks: 0.25,
          questions: {
            create: Array.from({ length: questionCount }, (_, i) => ({
              ...questionFixture(nonce, i + 1, (["A", "B", "C", "D"] as const)[i % 4]),
              questionType: "MCQ" as const,
              order: i + 1,
              subject: `${nonce} General Studies`,
            })),
          },
        }],
      },
    },
    include: { sections: { include: { questions: true } } },
  });
  return { series, test };
}

export function expectedScore({ correct, wrong, marks = 1, negative = 0.25 }: {
  correct: number; wrong: number; marks?: number; negative?: number;
}) {
  return correct * marks - wrong * negative;
}
