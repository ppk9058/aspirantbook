/**
 * CLI runner for Email Outbox Worker
 *
 * Usage:
 *   npx tsx scripts/process-email-outbox.ts [--batchSize=50]
 */

import { processEmailOutbox } from "../lib/email/outbox-worker";

async function main() {
  const args = process.argv.slice(2);
  let batchSize = 20;

  for (const arg of args) {
    if (arg.startsWith("--batchSize=")) {
      batchSize = Number.parseInt(arg.replace("--batchSize=", ""), 10) || 20;
    }
  }

  console.log(`[EmailOutboxWorker] Starting outbox processing (batchSize: ${batchSize})...`);
  const startTime = Date.now();

  try {
    const stats = await processEmailOutbox({ batchSize });
    const durationMs = Date.now() - startTime;
    console.log(
      `[EmailOutboxWorker] Completed in ${durationMs}ms. Stats: ${JSON.stringify(stats)}`
    );
    process.exit(0);
  } catch (err) {
    console.error("[EmailOutboxWorker] Fatal error running processor:", err);
    process.exit(1);
  }
}

main();
