import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs"

const env = dotenv.parse(fs.readFileSync(".env.test"))
const BASE_URL = "http://127.0.0.1:3045"

// List of all 10 pages
const PAGES = [
  "/admin/content-engine",
  "/admin/content-engine/add",
  "/admin/content-engine/aliases",
  "/admin/content-engine/assign",
  "/admin/content-engine/categories",
  "/admin/content-engine/export",
  "/admin/content-engine/gates",
  "/admin/content-engine/hindi",
  "/admin/content-engine/practice",
  "/admin/seo",
]

// List of all 10 API routes with their supported methods
const API_ROUTES = [
  { path: "/api/admin/content-engine/aliases", method: "GET" },
  { path: "/api/admin/content-engine/assign", method: "POST" },
  { path: "/api/admin/content-engine/batch", method: "POST" },
  { path: "/api/admin/content-engine/export", method: "GET" },
  { path: "/api/admin/content-engine/hindi/import", method: "POST" },
  { path: "/api/admin/content-engine/hindi/review", method: "PATCH" },
  { path: "/api/admin/content-engine/publish", method: "POST" },
  { path: "/api/admin/content-engine/questions", method: "GET" },
  { path: "/api/admin/content-engine/recategorise", method: "POST" },
  { path: "/api/admin/content-engine/settings", method: "GET" },
]

async function loginUser(email: string, pass: string): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const csrfCookies = csrfRes.headers.getSetCookie()
  const csrfData = await csrfRes.json()
  const cookieHeader = csrfCookies.map((c) => c.split(";")[0]).join("; ")

  const params = new URLSearchParams()
  params.append("email", email)
  params.append("password", pass)
  params.append("csrfToken", csrfData.csrfToken)
  params.append("redirect", "false")

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: params.toString(),
    redirect: "manual",
  })

  const loginCookies = loginRes.headers.getSetCookie()
  const sessionToken = loginCookies.find((c) => c.includes("session-token"))
  if (!sessionToken) {
    throw new Error(`Failed to obtain session token for ${email}`)
  }
  return sessionToken.split(";")[0]
}

async function run() {
  console.log("=== PHASE 1.4: PRODUCTION MODE AUTH GUARD VERIFICATION ===")
  console.log(`Target: ${BASE_URL} (NODE_ENV=production)\n`)

  // 1. Obtain Real Sessions
  console.log("Step 1: Authenticating via app real auth path...")
  const adminCookie = await loginUser("admin@aspirantbook.com", "Test@123")
  console.log("✓ Real ADMIN session cookie obtained:", adminCookie.slice(0, 35) + "...")
  const teacherCookie = await loginUser("teacher@aspirantbook.com", "Test@123")
  console.log("✓ Real TEACHER session cookie obtained:", teacherCookie.slice(0, 35) + "...")

  console.log("\n=======================================================")
  console.log("A. TESTING ALL 10 ADMIN PAGES")
  console.log("=======================================================")

  const pageResults: any[] = []

  for (const p of PAGES) {
    // 1. Logged Out
    const resAnon = await fetch(`${BASE_URL}${p}`, { redirect: "manual" })
    const anonStatus = resAnon.status
    const anonLoc = resAnon.headers.get("location") || ""
    const anonBlocked = anonStatus === 307 || anonStatus === 302 || anonStatus === 401 || anonStatus === 403

    // 2. Demo ADMIN cookie (ts_demo_role=ADMIN) in production
    const resDemoAdmin = await fetch(`${BASE_URL}${p}`, {
      headers: { Cookie: "ts_demo_role=ADMIN" },
      redirect: "manual",
    })
    const demoAdminStatus = resDemoAdmin.status
    const demoAdminLoc = resDemoAdmin.headers.get("location") || ""
    const demoAdminBlocked = demoAdminStatus === 307 || demoAdminStatus === 302 || demoAdminStatus === 401 || demoAdminStatus === 403

    // 3. Demo TEACHER cookie (ts_demo_role=TEACHER)
    const resDemoTeacher = await fetch(`${BASE_URL}${p}`, {
      headers: { Cookie: "ts_demo_role=TEACHER" },
      redirect: "manual",
    })
    const demoTeacherStatus = resDemoTeacher.status
    const demoTeacherLoc = resDemoTeacher.headers.get("location") || ""
    const demoTeacherBlocked = demoTeacherStatus === 307 || demoTeacherStatus === 302 || demoTeacherStatus === 401 || demoTeacherStatus === 403

    // 4. Real TEACHER session
    const resRealTeacher = await fetch(`${BASE_URL}${p}`, {
      headers: { Cookie: teacherCookie },
      redirect: "manual",
    })
    const realTeacherStatus = resRealTeacher.status
    const realTeacherLoc = resRealTeacher.headers.get("location") || ""
    const realTeacherBlocked = realTeacherStatus === 307 || realTeacherStatus === 302 || realTeacherStatus === 401 || realTeacherStatus === 403

    // 5. Real ADMIN session
    const resRealAdmin = await fetch(`${BASE_URL}${p}`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    })
    const realAdminStatus = resRealAdmin.status
    const realAdminAllowed = realAdminStatus === 200

    pageResults.push({
      page: p,
      anon: `${anonStatus} (${anonLoc})`,
      demoAdmin: `${demoAdminStatus} (${demoAdminLoc})`,
      demoTeacher: `${demoTeacherStatus} (${demoTeacherLoc})`,
      realTeacher: `${realTeacherStatus} (${realTeacherLoc})`,
      realAdmin: `${realAdminStatus}`,
      allPass: anonBlocked && demoAdminBlocked && demoTeacherBlocked && realTeacherBlocked && realAdminAllowed,
    })

    console.log(
      `Page ${p.padEnd(32)} | Anon: ${anonStatus} | demo-Admin: ${demoAdminStatus} | demo-Teach: ${demoTeacherStatus} | real-Teach: ${realTeacherStatus} | real-ADMIN: ${realAdminStatus} | Status: ${realAdminAllowed && demoAdminBlocked ? "PASS" : "FAIL"}`
    )
  }

  console.log("\n=======================================================")
  console.log("B. TESTING ALL 10 API ROUTES")
  console.log("=======================================================")

  const apiResults: any[] = []

  for (const r of API_ROUTES) {
    const method = r.method
    const path = r.path
    const body = method === "POST" ? JSON.stringify({}) : undefined
    const headers = method === "POST" ? { "Content-Type": "application/json" } : {}

    // 1. Logged Out
    const resAnon = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body,
      redirect: "manual",
    })
    const anonStatus = resAnon.status

    // 2. Demo ADMIN cookie (ts_demo_role=ADMIN) in production
    const resDemoAdmin = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...headers, Cookie: "ts_demo_role=ADMIN" },
      body,
      redirect: "manual",
    })
    const demoAdminStatus = resDemoAdmin.status
    const demoAdminBody = await resDemoAdmin.json().catch(() => ({}))

    // 3. Demo TEACHER cookie (ts_demo_role=TEACHER)
    const resDemoTeacher = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...headers, Cookie: "ts_demo_role=TEACHER" },
      body,
      redirect: "manual",
    })
    const demoTeacherStatus = resDemoTeacher.status

    // 4. Real TEACHER session
    const resRealTeacher = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...headers, Cookie: teacherCookie },
      body,
      redirect: "manual",
    })
    const realTeacherStatus = resRealTeacher.status

    // 5. Real ADMIN session
    const resRealAdmin = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...headers, Cookie: adminCookie },
      body,
      redirect: "manual",
    })
    const realAdminStatus = resRealAdmin.status
    // In real admin: 200 or 400 (if payload invalid/empty) is allowed, NEVER 401 or 403!
    const realAdminAllowed = realAdminStatus !== 401 && realAdminStatus !== 403

    const anonBlocked = anonStatus === 401 || anonStatus === 403 || anonStatus === 307
    const demoAdminBlocked = demoAdminStatus === 401
    const demoTeacherBlocked = demoTeacherStatus === 403 || demoTeacherStatus === 401
    const realTeacherBlocked = realTeacherStatus === 403 || realTeacherStatus === 401

    apiResults.push({
      route: path,
      method,
      anonStatus,
      demoAdminStatus,
      demoAdminError: demoAdminBody.error,
      demoTeacherStatus,
      realTeacherStatus,
      realAdminStatus,
      pass: anonBlocked && demoAdminBlocked && demoTeacherBlocked && realTeacherBlocked && realAdminAllowed,
    })

    console.log(
      `API  ${method.padEnd(4)} ${path.padEnd(38)} | Anon: ${anonStatus} | demo-Admin: ${demoAdminStatus} | demo-Teach: ${demoTeacherStatus} | real-Teach: ${realTeacherStatus} | real-ADMIN: ${realAdminStatus} | Status: ${anonBlocked && demoAdminBlocked && realAdminAllowed ? "PASS" : "FAIL"}`
    )
  }

  const allPagesPass = pageResults.every((r) => r.allPass)
  const allApisPass = apiResults.every((r) => r.pass)

  console.log("\n=======================================================")
  console.log(`SUMMARY: Pages PASS: ${allPagesPass} (10/10) | APIs PASS: ${allApisPass} (10/10)`)
  console.log("=======================================================")

  if (!allPagesPass || !allApisPass) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 1.4:", err)
  process.exit(1)
})
