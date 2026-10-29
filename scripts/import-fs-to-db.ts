import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { prisma } from "../lib/prisma";
import { buildAuditDedupeKey } from "../lib/audit/audit-event-key";

interface ImportStats {
  scanned: number;
  imported: number;
  skipped: number;
  errors: number;
}

const isDryRun = process.argv.includes("--dry-run");

async function importBooks(): Promise<ImportStats> {
  const stats: ImportStats = { scanned: 0, imported: 0, skipped: 0, errors: 0 };
  const filePath = path.join(process.cwd(), "data", "books.json");

  if (!fs.existsSync(filePath)) {
    console.log("  [books] data/books.json not found, skipping.");
    return stats;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const books = JSON.parse(raw);
    if (!Array.isArray(books)) return stats;

    stats.scanned = books.length;
    for (const b of books) {
      if (!b.id || !b.slug) {
        stats.skipped++;
        continue;
      }

      if (isDryRun) {
        stats.imported++;
        continue;
      }

      await prisma.book.upsert({
        where: { id: b.id },
        create: {
          id: b.id,
          slug: b.slug,
          title: b.title || "Untitled",
          status: b.status || "published",
          price: Number(b.price) || 0,
          salesCount: Number(b.salesCount) || 0,
          data: b,
        },
        update: {
          slug: b.slug,
          title: b.title || "Untitled",
          status: b.status || "published",
          price: Number(b.price) || 0,
          salesCount: Number(b.salesCount) || 0,
          data: b,
        },
      });
      stats.imported++;
    }
  } catch (err) {
    console.error("  [books] Error during import:", err);
    stats.errors++;
  }
  return stats;
}

async function importDoubts(): Promise<ImportStats> {
  const stats: ImportStats = { scanned: 0, imported: 0, skipped: 0, errors: 0 };
  const filePath = path.join(process.cwd(), "data", "doubts.json");

  if (!fs.existsSync(filePath)) {
    console.log("  [doubts] data/doubts.json not found, skipping.");
    return stats;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const doubts = JSON.parse(raw);
    if (!Array.isArray(doubts)) return stats;

    stats.scanned = doubts.length;
    for (const d of doubts) {
      if (!d.id || !d.questionText) {
        stats.skipped++;
        continue;
      }

      if (isDryRun) {
        stats.imported++;
        continue;
      }

      await prisma.doubt.upsert({
        where: { id: d.id },
        create: {
          id: d.id,
          studentId: d.studentId || null,
          studentName: d.studentName || "Student",
          studentEmail: d.studentEmail || null,
          subject: d.subject || "General",
          topic: d.topic || null,
          questionText: d.questionText,
          attachmentName: d.attachment?.name || null,
          attachmentUrl: d.attachment?.url || null,
          attachmentType: d.attachment?.type || null,
          attachmentSize: d.attachment?.size || null,
          status: d.status || "PENDING",
          teacherAnswer: d.teacherAnswer || null,
          teacherName: d.teacherName || null,
          answeredAt: d.answeredAt ? new Date(d.answeredAt) : null,
          upvotes: d.upvotes || 0,
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        },
        update: {
          status: d.status || "PENDING",
          teacherAnswer: d.teacherAnswer || null,
          teacherName: d.teacherName || null,
          answeredAt: d.answeredAt ? new Date(d.answeredAt) : null,
          upvotes: d.upvotes || 0,
        },
      });
      stats.imported++;
    }
  } catch (err) {
    console.error("  [doubts] Error during import:", err);
    stats.errors++;
  }
  return stats;
}

async function importFormSubmissions(): Promise<ImportStats> {
  const stats: ImportStats = { scanned: 0, imported: 0, skipped: 0, errors: 0 };
  const filePath = path.join(process.cwd(), "data", "form-submissions.json");

  if (!fs.existsSync(filePath)) {
    console.log("  [forms] data/form-submissions.json not found, skipping.");
    return stats;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const submissions = JSON.parse(raw);
    if (!Array.isArray(submissions)) return stats;

    stats.scanned = submissions.length;
    for (const s of submissions) {
      if (!s.id || !s.formSlug) {
        stats.skipped++;
        continue;
      }

      if (isDryRun) {
        stats.imported++;
        continue;
      }

      await prisma.formSubmission.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          formSlug: s.formSlug,
          userId: s.userId || null,
          userName: s.userName || null,
          userEmail: s.userEmail || null,
          formData: s.data || {},
          attachmentUrl: s.attachmentUrl || null,
          attachmentName: s.attachmentName || null,
          status: s.status || "SUBMITTED",
          adminNotes: s.adminNotes || null,
          submittedAt: s.submittedAt ? new Date(s.submittedAt) : new Date(),
        },
        update: {
          status: s.status || "SUBMITTED",
          adminNotes: s.adminNotes || null,
        },
      });
      stats.imported++;
    }
  } catch (err) {
    console.error("  [forms] Error during import:", err);
    stats.errors++;
  }
  return stats;
}

async function importAuditEvents(): Promise<ImportStats> {
  const stats: ImportStats = { scanned: 0, imported: 0, skipped: 0, errors: 0 };
  const filePath = path.join(process.cwd(), ".content-audit", "audit-events.jsonl");

  if (!fs.existsSync(filePath)) {
    console.log("  [audit] .content-audit/audit-events.jsonl not found, skipping.");
    return stats;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    stats.scanned = lines.length;

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (!item.entityId || !item.action) {
          stats.skipped++;
          continue;
        }

        const dedupeKey = buildAuditDedupeKey(item);

        if (isDryRun) {
          stats.imported++;
          continue;
        }

        await prisma.auditEvent.upsert({
          where: { dedupeKey },
          create: {
            dedupeKey,
            entityId: item.entityId,
            entityType: item.entityType || "general",
            action: item.action,
            userId: item.userId || null,
            userEmail: item.userEmail || null,
            details: item.details || {},
            createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
          },
          update: {
            details: item.details || {},
          },
        });
        stats.imported++;
      } catch {
        stats.skipped++;
      }
    }
  } catch (err) {
    console.error("  [audit] Error during import:", err);
    stats.errors++;
  }
  return stats;
}

async function importEmailOutbox(): Promise<ImportStats> {
  const stats: ImportStats = { scanned: 0, imported: 0, skipped: 0, errors: 0 };
  const filePath = path.join(process.cwd(), ".email-outbox", "outbox.jsonl");

  if (!fs.existsSync(filePath)) {
    console.log("  [email] .email-outbox/outbox.jsonl not found, skipping.");
    return stats;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    stats.scanned = lines.length;

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (!item.to || !item.subject) {
          stats.skipped++;
          continue;
        }

        if (isDryRun) {
          stats.imported++;
          continue;
        }

        if (item.id) {
          await prisma.emailOutbox.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              to: item.to,
              subject: item.subject,
              html: item.html || null,
              text: item.text || null,
              link: item.link || null,
              token: item.token || null,
              status: "SENT",
              provider: "dev",
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              sentAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            },
            update: {
              status: "SENT",
            },
          });
        } else {
          await prisma.emailOutbox.create({
            data: {
              to: item.to,
              subject: item.subject,
              html: item.html || null,
              text: item.text || null,
              link: item.link || null,
              token: item.token || null,
              status: "SENT",
              provider: "dev",
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              sentAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            },
          });
        }
        stats.imported++;
      } catch {
        stats.skipped++;
      }
    }
  } catch (err) {
    console.error("  [email] Error during import:", err);
    stats.errors++;
  }
  return stats;
}

export async function runFsToDbImport(): Promise<void> {
  console.log(`Starting FS to DB Data Import${isDryRun ? " [DRY RUN MODE]" : ""}...`);
  
  console.log("\n1. Importing Books...");
  const bookStats = await importBooks();
  console.log(`   Books: ${bookStats.imported} imported / ${bookStats.scanned} scanned (${bookStats.skipped} skipped, ${bookStats.errors} errors)`);

  console.log("\n2. Importing Doubts...");
  const doubtStats = await importDoubts();
  console.log(`   Doubts: ${doubtStats.imported} imported / ${doubtStats.scanned} scanned (${doubtStats.skipped} skipped, ${doubtStats.errors} errors)`);

  console.log("\n3. Importing Form Submissions...");
  const formStats = await importFormSubmissions();
  console.log(`   Forms: ${formStats.imported} imported / ${formStats.scanned} scanned (${formStats.skipped} skipped, ${formStats.errors} errors)`);

  console.log("\n4. Importing Content Audit Trail...");
  const auditStats = await importAuditEvents();
  console.log(`   Audit: ${auditStats.imported} imported / ${auditStats.scanned} scanned (${auditStats.skipped} skipped, ${auditStats.errors} errors)`);

  console.log("\n5. Importing Email Outbox...");
  const emailStats = await importEmailOutbox();
  console.log(`   Email Outbox: ${emailStats.imported} imported / ${emailStats.scanned} scanned (${emailStats.skipped} skipped, ${emailStats.errors} errors)`);

  console.log(`\nImport complete! Total items scanned: ${bookStats.scanned + doubtStats.scanned + formStats.scanned + auditStats.scanned + emailStats.scanned}`);
}

if (process.argv[1] && process.argv[1].endsWith("import-fs-to-db.ts")) {
  runFsToDbImport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal import failure:", err);
      process.exit(1);
    });
}
