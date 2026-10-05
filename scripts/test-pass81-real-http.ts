import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { prisma } from "../lib/prisma";
import { encode } from "next-auth/jwt";
import { createTestUser, teardownTestUsers } from "../lib/testing/test-user-helper";

const BASE_URL = "http://localhost:3000";
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

const LEAK_PATTERNS = [
  { name: "videoUrl", regex: /"videoUrl"\s*:\s*"(https?:\\\/\\\/|https?:\/\/)[^"]+"/i },
  { name: "youtube", regex: /youtube\.com|youtu\.be/i },
  { name: "real_video_id", regex: /dQw4w9WgXcQ/ },
  { name: "telegram_text", regex: /t\.me\/bpsc_vip_current_affairs/ },
  { name: "attachmentUrl", regex: /"attachmentUrl"\s*:\s*"[^"]+"/i },
];

async function createCookie(userId: string, role: string, email: string) {
  const token = await encode({
    token: { id: userId, role, email },
    secret: SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${token}`;
}

async function fetchBody(url: string, cookie?: string, isRsc: boolean = false) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  if (isRsc) {
    headers["RSC"] = "1";
    headers["Accept"] = "text/x-component";
  }
  const res = await fetch(url, { headers, redirect: "manual" });
  const text = await res.text();
  return { status: res.status, text };
}

function scanLeaks(text: string) {
  const counts: Record<string, number> = {};
  for (const p of LEAK_PATTERNS) {
    const matches = text.match(new RegExp(p.regex, "g"));
    counts[p.name] = matches ? matches.length : 0;
  }
  return counts;
}

async function run() {
  console.log("=== STEP 4: PASS 8.1 REAL HTTP RETEST ===");

  // Find 72nd course
  const course72 = await prisma.course.findUnique({
    where: { slug: "72nd-bpsc-prelims-current-affairs" },
  });
  if (!course72) throw new Error("72nd course not found");

  // Find 4 lessons:
  // 1. locked lesson with attachment (Telegram)
  const l1_locked = "cmui8hds90004xpacc9bropjd";
  // 2. locked lesson with video (Lesson - 9)
  const l2_locked_video = "cmui8he86000cxpac7zln2otl";
  // 3. trial lesson with video + attachment
  const l3_trial = "cmui8herr000mxpacbh2up10n";
  // 4. second trial lesson
  const l4_trial2 = "cmui9421h0001xph6b4rsghsm";

  // Second paid course
  const course2 = await prisma.course.findUnique({
    where: { slug: "bpsc-2nd-video-tutorial" },
  });
  if (!course2) throw new Error("bpsc-2nd-video-tutorial not found");

  // Create test users: unpaid, enrolled, admin
  const unpaidUser = await createTestUser({ role: "FREE", prefix: "unpaid" });
  const enrolledUser = await createTestUser({ role: "FREE", prefix: "enrolled" });
  const adminUser = await createTestUser({ role: "ADMIN", prefix: "admin" });

  // Enroll enrolledUser in 72nd course
  const enrollment72 = await prisma.enrollment.create({
    data: {
      userId: enrolledUser.id,
      courseId: course72.id,
    },
  });

  const unpaidCookie = await createCookie(unpaidUser.id, "FREE", unpaidUser.email);
  const enrolledCookie = await createCookie(enrolledUser.id, "FREE", enrolledUser.email);
  const adminCookie = await createCookie(adminUser.id, "ADMIN", adminUser.email);

  const roles = [
    { name: "anonymous", cookie: "" },
    { name: "unpaid", cookie: unpaidCookie },
    { name: "enrolled", cookie: enrolledCookie },
    { name: "admin", cookie: adminCookie },
  ];

  const testUrls = [
    { desc: "Course 72nd Page HTML", path: `/courses/${course72.slug}`, isRsc: false },
    { desc: "Course 72nd Page RSC", path: `/courses/${course72.slug}`, isRsc: true },
    { desc: "Course 2nd Page HTML", path: `/courses/${course2.slug}`, isRsc: false },
    { desc: "Course 2nd Page RSC", path: `/courses/${course2.slug}`, isRsc: true },
    { desc: "Learn Lesson 1 (Locked Telegram) HTML", path: `/courses/${course72.slug}/learn/${l1_locked}`, isRsc: false },
    { desc: "Learn Lesson 1 (Locked Telegram) RSC", path: `/courses/${course72.slug}/learn/${l1_locked}`, isRsc: true },
    { desc: "Learn Lesson 2 (Locked Video) HTML", path: `/courses/${course72.slug}/learn/${l2_locked_video}`, isRsc: false },
    { desc: "Learn Lesson 2 (Locked Video) RSC", path: `/courses/${course72.slug}/learn/${l2_locked_video}`, isRsc: true },
    { desc: "Learn Lesson 3 (Trial 1) HTML", path: `/courses/${course72.slug}/learn/${l3_trial}`, isRsc: false },
    { desc: "Learn Lesson 3 (Trial 1) RSC", path: `/courses/${course72.slug}/learn/${l3_trial}`, isRsc: true },
    { desc: "Learn Lesson 4 (Trial 2) HTML", path: `/courses/${course72.slug}/learn/${l4_trial2}`, isRsc: false },
    { desc: "Learn Lesson 4 (Trial 2) RSC", path: `/courses/${course72.slug}/learn/${l4_trial2}`, isRsc: true },
    { desc: "API video-courses", path: `/api/courses/video-courses`, isRsc: false },
    { desc: "API checkout course-info (72nd)", path: `/api/checkout/course-info?id=${course72.slug}`, isRsc: false },
    { desc: "Search Page HTML", path: `/search?q=bpsc`, isRsc: false },
    { desc: "My-Learning Page HTML", path: `/my-learning`, isRsc: false },
  ];

  const reportRows: any[] = [];

  try {
    for (const u of testUrls) {
      for (const r of roles) {
        const { status, text } = await fetchBody(`${BASE_URL}${u.path}`, r.cookie, u.isRsc);
        const leaks = scanLeaks(text);
        reportRows.push({
          target: u.desc,
          role: r.name,
          status,
          videoUrl: leaks.videoUrl,
          youtube: leaks.youtube,
          realId: leaks.real_video_id,
          telegram: leaks.telegram_text,
          attachmentUrl: leaks.attachmentUrl,
        });
      }
    }

    console.table(reportRows);
  } finally {
    await prisma.enrollment.delete({ where: { id: enrollment72.id } }).catch(() => {});
    await teardownTestUsers([unpaidUser.id, enrolledUser.id, adminUser.id]);
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("FATAL in test-pass81-real-http:", err);
  process.exit(1);
});
