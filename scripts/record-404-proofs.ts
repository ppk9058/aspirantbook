import { spawn } from "child_process";
import { PrismaClient } from "@prisma/client";
import { assertTestDb } from "../lib/testing/assert-test-db";

const DOCKER_DB_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test";
process.env.DATABASE_URL = DOCKER_DB_URL;
process.env.DIRECT_URL = DOCKER_DB_URL;
process.env.TEST_DATABASE_URL = DOCKER_DB_URL;
assertTestDb();

const TEST_PORT = 3045;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function main() {
  console.log("TEST DB: yes | host: 127.0.0.1:54329 | db: trillionskill_test");
  console.log("BASE_URL:", BASE_URL);

  const targets = [
    { label: "DRAFT COURSE PAGE", url: `${BASE_URL}/courses/draft-course-never-published` },
    { label: "UNKNOWN COURSE SLUG", url: `${BASE_URL}/courses/slug-completely-nonexistent-12345` },
    { label: "DRAFT DEMO SLOTS API", url: `${BASE_URL}/api/courses/draft-course-never-published/demo-slots` },
    { label: "UNKNOWN DEMO SLOTS API", url: `${BASE_URL}/api/courses/slug-completely-nonexistent-12345/demo-slots` },
    { label: "UNKNOWN TEST-SERIES PAGE", url: `${BASE_URL}/exam-series/series-completely-nonexistent-12345` },
    { label: "UNKNOWN LESSON PAGE", url: `${BASE_URL}/courses/72nd-bpsc-prelims-current-affairs/lessons/lesson_completely_nonexistent_9999` },
  ];

  for (const t of targets) {
    console.log(`\n======================================================`);
    console.log(`=== ${t.label}: ${t.url} ===`);
    console.log(`======================================================`);

    const res = await fetch(t.url, { redirect: "manual" });
    console.log(`HTTP/1.1 ${res.status} ${res.statusText}`);
    res.headers.forEach((val, key) => {
      console.log(`${key}: ${val}`);
    });
  }
}

main().catch(console.error);
