import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
const BASE_URL = "http://127.0.0.1:3045";

async function main() {
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const timestamp = new Date().toISOString();

  console.log("================================================================================");
  console.log("PART F: REAL DRAFT / UNPUBLISHED CONTENT 404 ENFORCEMENT ON TEST DB");
  console.log(`Commit: ${commit}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("Database: postgresql://***@127.0.0.1:54329/trillionskill_test");
  console.log("================================================================================");

  const prisma = new PrismaClient({ datasources: { db: { url: DOCKER_DB_URL } } });

  const draftCourseSlug = `draft-course-${Date.now()}`;
  const pubCourseSlug = `pub-course-${Date.now()}`;

  console.log("\n--- SECTION F.1: SEEDING REAL DRAFT & PUBLISHED ROWS IN TEST DB ---");
  const draftCourse = await prisma.course.create({
    data: {
      slug: draftCourseSlug,
      title: "Draft Course For Pass 10.5",
      description: "Draft Course Verification",
      difficulty: "BEGINNER",
      status: "DRAFT",
      isPublished: false,
      price: 1999,
    }
  });

  const pubCourse = await prisma.course.create({
    data: {
      slug: pubCourseSlug,
      title: "Published Control Course For Pass 10.5",
      description: "Published Course Verification",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isPublished: true,
      price: 999,
    }
  });

  console.log(`Seeded Draft Course:     ${draftCourse.slug} (isPublished=false)`);
  console.log(`Seeded Published Course: ${pubCourse.slug} (isPublished=true)`);

  const tests = [
    { label: "Draft Course Detail Page", path: `/courses/${draftCourseSlug}`, expected: "404" },
    { label: "Published Control Course Page", path: `/courses/${pubCourseSlug}`, expected: "200" },
    { label: "Draft Course Checkout API", path: `/api/checkout/course-info?id=${draftCourseSlug}`, expected: "404" },
    { label: "Published Course Checkout API", path: `/api/checkout/course-info?id=${pubCourseSlug}`, expected: "200" },
    { label: "Unlisted Test Series Page", path: "/test-series/unlisted-series-9999", expected: "404" },
  ];

  console.log("\n--- SECTION F.2: RAW HTTP STATUS EVALUATION ---");
  let passedCount = 0;
  let totalCount = tests.length;

  for (const t of tests) {
    const code = execSync(`curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${t.path}"`, { encoding: "utf8" }).trim();
    const passed = code === t.expected;
    if (passed) passedCount++;
    console.log(`[HTTP CHECK] ${t.label.padEnd(35)} (${t.path}) => HTTP ${code} (Expected: ${t.expected}) => ${passed ? "PASS" : "FAIL"}`);
  }

  // 3. Sitemap.xml check
  console.log("\n--- SECTION F.3: SITEMAP.XML AUDIT ---");
  const sitemapContent = execSync(`curl -s "${BASE_URL}/sitemap.xml"`, { encoding: "utf8" });
  const hasDraftCourse = sitemapContent.includes(draftCourseSlug);
  const hasPubCourse = sitemapContent.includes(pubCourseSlug);
  console.log(`Sitemap contains Draft Course (${draftCourseSlug}): ${hasDraftCourse ? "YES (FAIL)" : "NO (PASS)"}`);
  console.log(`Sitemap contains Published Tutorials/Pages: ${sitemapContent.includes("/tutorials") ? "YES (PASS)" : "NO"}`);

  // 4. Cleanup
  console.log("\n--- SECTION F.4: SEED CLEANUP ---");
  await prisma.course.deleteMany({
    where: { id: { in: [draftCourse.id, pubCourse.id] } }
  });
  console.log("Deleted temporary test database rows successfully.");
  await prisma.$disconnect();

  console.log(`\nTOTAL DRAFT/CONTROL CHECKS PASSED: ${passedCount} / ${totalCount}`);
  console.log("\n================================================================================");
  console.log("PART F VERIFICATION COMPLETE");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Error in Part F:", err);
  process.exit(1);
});
