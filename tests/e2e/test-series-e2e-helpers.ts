import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page, TestInfo } from "@playwright/test";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
if (!TEST_DATABASE_URL) {
  throw new Error("E2E specs require TEST_DATABASE_URL or DATABASE_URL to be set.");
}
const parsedTestDatabaseUrl = new URL(TEST_DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(parsedTestDatabaseUrl.hostname) ||
    !parsedTestDatabaseUrl.pathname.endsWith("/trillionskill_test")) {
  throw new Error("E2E specs require the Docker trillionskill_test database.");
}

export const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
export const PASSWORD = "E2E!localPass9";

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

export async function loginThroughUi(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const responsePromise = page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Sign In" }).click();
  const response = await responsePromise;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const sessionResponse = await page.request.get("/api/auth/session");
    if (sessionResponse.ok()) {
      const session = await sessionResponse.json() as { user?: { id: string; role: string } } | null;
      if (session?.user?.id) return session;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Credential sign-in returned ${response.status()}, but no authenticated session was established.`);
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
