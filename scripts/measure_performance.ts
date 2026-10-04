import { chromium, Browser, BrowserContext } from "playwright";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

interface FlowMetric {
  id: string;
  name: string;
  path: string;
  role: "PUBLIC" | "STUDENT" | "TEACHER";
  ttfb: number;
  fcp: number;
  lcp: number;
  domContentLoaded: number;
  loadTime: number;
  transferSizeKb: number;
  requestCount: number;
  status: number;
}

const FLOWS = [
  { id: "flow-01", name: "Public Homepage", path: "/", role: "PUBLIC" as const },
  { id: "flow-02", name: "Student Dashboard", path: "/dashboard", role: "STUDENT" as const },
  { id: "flow-03", name: "Test Series Hub", path: "/test-series", role: "STUDENT" as const },
  { id: "flow-04", name: "Test Series Detail (BPSC)", path: "/test-series/bpsc-72nd-2026", role: "STUDENT" as const },
  { id: "flow-05", name: "Exam Instructions", path: "/test-series/bpsc-72nd-2026/instructions?testId=bpsc-sectional-5q", role: "STUDENT" as const },
  { id: "flow-06", name: "Exam Attempt", path: "/test-series/bpsc-72nd-2026/attempt?testId=bpsc-sectional-5q", role: "STUDENT" as const },
  { id: "flow-07", name: "Exam Result", path: "/test-series/bpsc-72nd-2026/result?testId=bpsc-sectional-5q&attemptId=cmus3awyg0001xpr8vhh9ped3", role: "STUDENT" as const },
  { id: "flow-08", name: "Exam Solutions", path: "/test-series/bpsc-72nd-2026/solutions?testId=bpsc-sectional-5q&attemptId=cmus3awyg0001xpr8vhh9ped3", role: "STUDENT" as const },
  { id: "flow-09", name: "My Tests", path: "/my-tests", role: "STUDENT" as const },
  { id: "flow-10", name: "Courses Catalog", path: "/courses", role: "STUDENT" as const },
  { id: "flow-11", name: "Course Detail", path: "/courses/generative-ai", role: "STUDENT" as const },
  { id: "flow-12", name: "Books Store", path: "/books", role: "STUDENT" as const },
  { id: "flow-13", name: "PYQs Hub", path: "/pyqs", role: "STUDENT" as const },
  { id: "flow-14", name: "Subscription & Pricing", path: "/subscription", role: "STUDENT" as const },
  { id: "flow-15", name: "Teacher Test Studio", path: "/teacher/test-series/create", role: "TEACHER" as const },
];

async function setupTestUsers(baseUrl: string, browser: Browser) {
  const runId = randomUUID().slice(0, 8);
  const rawPassword = `PerfP@ss!${runId}`;
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const studentUser = await prisma.user.create({
    data: {
      email: `perf_student_${runId}@internal.test`,
      name: "Perf Student",
      role: "PREMIUM",
      password: passwordHash,
      subscriptions: {
        create: {
          plan: "YEARLY",
          status: "ACTIVE",
          provider: "RAZORPAY",
          providerId: `sub_perf_${runId}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        },
      },
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: `perf_teacher_${runId}@internal.test`,
      name: "Perf Teacher",
      role: "TEACHER",
      password: passwordHash,
    },
  });

  async function loginAndGetStorage(user: { email: string; rawPassword: string; role: string }) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await ctx.addCookies([
      {
        name: "ts_demo_role",
        value: user.role,
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const authStatus = await page.evaluate(
      async ({ email, password, baseUrl }) => {
        const csrfRes = await fetch("/api/auth/csrf");
        const { csrfToken } = await csrfRes.json();
        const res = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email,
            password,
            csrfToken,
            callbackUrl: `${baseUrl}/dashboard`,
            json: "true",
          }),
        });
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        return { status: res.status, user: sessionData?.user };
      },
      { email: user.email, password: user.rawPassword, baseUrl }
    );

    if (!authStatus.user?.id) {
      await ctx.close();
      throw new Error(`Failed to log in ${user.email} (status: ${authStatus.status})`);
    }

    const storage = await ctx.storageState();
    await ctx.close();
    return storage;
  }

  const studentStorage = await loginAndGetStorage({
    email: studentUser.email,
    rawPassword,
    role: "STUDENT",
  });

  const teacherStorage = await loginAndGetStorage({
    email: teacherUser.email,
    rawPassword,
    role: "TEACHER",
  });

  return {
    studentUser,
    teacherUser,
    studentStorage,
    teacherStorage,
  };
}

async function measureFlow(
  browser: Browser,
  baseUrl: string,
  flow: (typeof FLOWS)[0],
  storageState: any
): Promise<FlowMetric> {
  const context = await browser.newContext({
    storageState: storageState || undefined,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  let totalTransferBytes = 0;
  let requestCount = 0;

  const page = await context.newPage();

  page.on("request", () => {
    requestCount++;
  });

  page.on("response", async (response) => {
    try {
      const headers = response.headers();
      const contentLength = headers["content-length"];
      if (contentLength) {
        totalTransferBytes += parseInt(contentLength, 10);
      }
    } catch {}
  });

  // Apply CDP throttling: 4x CPU throttle + Fast 4G network emulation
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  // Fast 4G: 1.6 Mbps download (200 KB/s), 750 Kbps upload (93.75 KB/s), 150ms roundtrip latency
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  });

  let httpStatus = 0;
  const targetUrl = `${baseUrl}${flow.path}`;

  try {
    const resp = await page.goto(targetUrl, {
      waitUntil: "load",
      timeout: 45000,
    });
    httpStatus = resp?.status() || 0;
  } catch (err: any) {
    console.warn(`[WARN] Navigation timeout or error on ${flow.path}: ${err?.message}`);
  }

  // Collect Performance Timing via evaluate
  const metrics = await page.evaluate(async () => {
    // Wait slightly to ensure paints and observers register
    await new Promise((r) => setTimeout(r, 1200));

    let fcp = 0;
    let lcp = 0;

    try {
      const paintEntries = performance.getEntriesByType("paint");
      for (const entry of paintEntries) {
        if (entry.name === "first-contentful-paint") {
          fcp = Math.round(entry.startTime);
        }
      }
    } catch {}

    try {
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      if (lcpEntries.length > 0) {
        lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }
    } catch {}

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
    const domContentLoaded = nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0;
    const loadTime = nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0;

    return {
      ttfb: Math.max(ttfb, 0),
      fcp: Math.max(fcp, 0),
      lcp: Math.max(lcp, fcp, 0),
      domContentLoaded: Math.max(domContentLoaded, 0),
      loadTime: Math.max(loadTime, 0),
    };
  });

  await context.close();

  return {
    id: flow.id,
    name: flow.name,
    path: flow.path,
    role: flow.role,
    ttfb: metrics.ttfb,
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    domContentLoaded: metrics.domContentLoaded,
    loadTime: metrics.loadTime,
    transferSizeKb: Math.round(totalTransferBytes / 1024),
    requestCount,
    status: httpStatus,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => a.startsWith("--target="))?.split("=")[1] || "dev";
  const port = args.find((a) => a.startsWith("--port="))?.split("=")[1] || "3000";
  const baseUrl = `http://localhost:${port}`;

  console.log(`\n======================================================`);
  console.log(`RUNNING PERFORMANCE BENCHMARK`);
  console.log(`Target: ${target.toUpperCase()} (${baseUrl})`);
  console.log(`Conditions: CPU Throttle 4x, Fast 4G (150ms RTT, 1.6Mbps down)`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  let studentUser: any = null;
  let teacherUser: any = null;

  try {
    console.log("Setting up isolated performance benchmark users in DB...");
    const auth = await setupTestUsers(baseUrl, browser);
    studentUser = auth.studentUser;
    teacherUser = auth.teacherUser;
    console.log(`Created benchmark users. Starting flow measurements...\n`);

    const results: FlowMetric[] = [];

    for (const flow of FLOWS) {
      console.log(`Measuring [${flow.id}] ${flow.name} (${flow.path})...`);
      let storage: any = null;
      if (flow.role === "STUDENT") storage = auth.studentStorage;
      if (flow.role === "TEACHER") storage = auth.teacherStorage;

      const metric = await measureFlow(browser, baseUrl, flow, storage);
      results.push(metric);
      console.log(
        `  -> Status: ${metric.status} | TTFB: ${metric.ttfb}ms | FCP: ${metric.fcp}ms | LCP: ${metric.lcp}ms | Load: ${metric.loadTime}ms | Size: ${metric.transferSizeKb}KB`
      );
    }

    console.log("\n==========================================================================================");
    console.log(`SUMMARY OF RESULTS FOR ${target.toUpperCase()}`);
    console.log("==========================================================================================");
    console.table(
      results.map((r) => ({
        ID: r.id,
        Name: r.name,
        Role: r.role,
        Status: r.status,
        "TTFB (ms)": r.ttfb,
        "FCP (ms)": r.fcp,
        "LCP (ms)": r.lcp,
        "Load (ms)": r.loadTime,
        "Size (KB)": r.transferSizeKb,
        Reqs: r.requestCount,
      }))
    );

    // Write JSON file for comparison
    const fs = await import("fs");
    fs.writeFileSync(
      `scripts/perf_results_${target}.json`,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          target,
          baseUrl,
          results,
        },
        null,
        2
      )
    );
    console.log(`\nSaved benchmark data to scripts/perf_results_${target}.json`);
  } finally {
    await browser.close();
    console.log("\nCleaning up test records from DB...");
    if (studentUser) {
      await prisma.subscription.deleteMany({ where: { userId: studentUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: studentUser.id } }).catch(() => {});
    }
    if (teacherUser) {
      await prisma.user.delete({ where: { id: teacherUser.id } }).catch(() => {});
    }
    console.log("Cleanup complete.");
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR during performance benchmark:", err);
  process.exit(1);
});
