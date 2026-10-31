import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";

const TEST_PORT = 3045;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (() => { throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required"); })();

const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });

async function createCookie(userId: string, role: string, email: string) {
  const token = {
    name: `User ${role}`,
    email,
    sub: userId,
    id: userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  const sessionToken = await encode({ token, secret: SECRET, salt: "authjs.session-token" });
  return sessionToken;
}

const ROUTES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/courses", name: "courses" },
  { path: "/my-learning", name: "my_learning" },
  { path: "/test-series", name: "test_series" },
  { path: "/my-tests", name: "my_tests" },
  { path: "/profile", name: "profile" },
  { path: "/books", name: "books" },
  { path: "/pyqs", name: "pyqs" },
  { path: "/practice", name: "practice" },
  { path: "/current-affairs-quizzes", name: "quizzes" },
  { path: "/teacher", name: "teacher", roleRequired: "TEACHER" },
  { path: "/admin", name: "admin", roleRequired: "ADMIN" }
];

async function run() {
  fs.mkdirSync("artifacts/pass9", { recursive: true });

  const freeUser = await prisma.user.findFirst({ where: { role: "FREE" } });
  const teacherUser = await prisma.user.findFirst({ where: { role: "TEACHER" } });
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  const tokens: Record<string, string> = {
    FREE: await createCookie(freeUser!.id, "FREE", freeUser!.email || "free@test.local"),
    TEACHER: await createCookie(teacherUser!.id, "TEACHER", teacherUser!.email || "teacher@test.local"),
    ADMIN: await createCookie(adminUser!.id, "ADMIN", adminUser!.email || "admin@test.local")
  };

  const browser = await chromium.launch({ headless: true });

  // 1. ANONYMOUS Crawl
  console.log("--- 1. ANONYMOUS CRAWL ---");
  const anonContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const anonPage = await anonContext.newPage();

  for (const r of ["/courses/72nd-bpsc-prelims-current-affairs", "/pricing", "/login"]) {
    const res = await anonPage.goto(`${BASE_URL}${r}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log(`ANON ${r}: HTTP ${res?.status()}`);
    await anonPage.waitForTimeout(1000);
    const fname = `artifacts/pass9/anon_${r.replace(/[\/-]/g, "_")}.png`;
    await anonPage.screenshot({ path: fname });
  }
  await anonContext.close();

  // 2. FREE STUDENT Crawl (Desktop & Mobile)
  console.log("--- 2. FREE STUDENT CRAWL ---");
  const freeContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await freeContext.addCookies([
    { name: "authjs.session-token", value: tokens.FREE, domain: "127.0.0.1", path: "/" },
    { name: "next-auth.session-token", value: tokens.FREE, domain: "127.0.0.1", path: "/" }
  ]);
  const freePage = await freeContext.newPage();

  for (const r of ROUTES.filter(rt => !rt.roleRequired)) {
    const res = await freePage.goto(`${BASE_URL}${r.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log(`FREE ${r.path}: HTTP ${res?.status()} (final url: ${freePage.url()})`);
    await freePage.waitForTimeout(500);
    const fname = `artifacts/pass9/free_desktop_${r.name}.png`;
    await freePage.screenshot({ path: fname });
  }
  await freeContext.close();

  // Mobile Free Student
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobileContext.addCookies([
    { name: "authjs.session-token", value: tokens.FREE, domain: "127.0.0.1", path: "/" },
    { name: "next-auth.session-token", value: tokens.FREE, domain: "127.0.0.1", path: "/" }
  ]);
  const mobilePage = await mobileContext.newPage();
  for (const r of ["/dashboard", "/courses", "/my-learning", "/test-series", "/profile"]) {
    const res = await mobilePage.goto(`${BASE_URL}${r}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    console.log(`MOBILE FREE ${r}: HTTP ${res?.status()} (final url: ${mobilePage.url()})`);
    await mobilePage.waitForTimeout(500);
    const fname = `artifacts/pass9/free_mobile_${r.replace(/\//g, "_")}.png`;
    await mobilePage.screenshot({ path: fname });
  }
  await mobileContext.close();

  // 3. TEACHER Crawl
  console.log("--- 3. TEACHER CRAWL ---");
  const teacherContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await teacherContext.addCookies([
    { name: "authjs.session-token", value: tokens.TEACHER, domain: "127.0.0.1", path: "/" },
    { name: "next-auth.session-token", value: tokens.TEACHER, domain: "127.0.0.1", path: "/" }
  ]);
  const teacherPage = await teacherContext.newPage();
  const tRes = await teacherPage.goto(`${BASE_URL}/teacher`, { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log(`TEACHER /teacher: HTTP ${tRes?.status()} (final url: ${teacherPage.url()})`);
  await teacherPage.waitForTimeout(500);
  await teacherPage.screenshot({ path: `artifacts/pass9/teacher_dashboard.png` });
  await teacherContext.close();

  // 4. ADMIN Crawl
  console.log("--- 4. ADMIN CRAWL ---");
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await adminContext.addCookies([
    { name: "authjs.session-token", value: tokens.ADMIN, domain: "127.0.0.1", path: "/" },
    { name: "next-auth.session-token", value: tokens.ADMIN, domain: "127.0.0.1", path: "/" }
  ]);
  const adminPage = await adminContext.newPage();
  const aRes = await adminPage.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log(`ADMIN /admin: HTTP ${aRes?.status()} (final url: ${adminPage.url()})`);
  await adminPage.waitForTimeout(500);
  await adminPage.screenshot({ path: `artifacts/pass9/admin_dashboard.png` });
  await adminContext.close();

  await browser.close();
  await prisma.$disconnect();
  console.log("\nPLAYWRIGHT CRAWL COMPLETE. Screenshots saved in artifacts/pass9/.");
}

run().catch(console.error);
