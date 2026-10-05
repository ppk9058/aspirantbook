import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function run() {
  console.log("=== STEP B1: FULL-ROW JSON SNAPSHOT BACKUP OF DEV DATABASE ===");
  await prisma.$executeRawUnsafe(`SET default_transaction_read_only = on`);

  const tables = [
    "User", "Account", "Course", "Lesson", "Chapter", "Enrollment", "Payment",
    "Subscription", "Progress", "ExamSeries", "ExamTest", "ExamSection", "ExamQuestion",
    "ExamAttempt", "ExamAttemptAnswer", "ExamSeriesEnrollment", "Coupon", "CouponRedemption",
    "CourseDemoBooking", "DemoBooking", "DemoStageSession", "DemoChatMessage"
  ];

  const backupData: Record<string, any[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      backupData[table] = rows;
      rowCounts[table] = rows.length;
    } catch (err: any) {
      console.log(`Table ${table} could not be queried: ${err.message}`);
    }
  }

  const timestamp = Date.now();
  const backupDir = "backups";
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `pass85-dev-full-${timestamp}.json`);
  const jsonContent = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(backupFilePath, jsonContent, "utf8");

  const stats = fs.statSync(backupFilePath);
  console.log("\n--- BACKUP METADATA ---");
  console.log("Backup file path:", backupFilePath);
  console.log("File size (bytes):", stats.size);
  console.log("File size (KB):", (stats.size / 1024).toFixed(2));

  console.log("\n--- ROW COUNTS PER TABLE IN BACKUP ---");
  console.table(Object.entries(rowCounts).map(([table, count]) => ({ table, rowCount: count })));
}

run()
  .catch((err) => {
    console.error("FATAL in backup-dev-db:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
