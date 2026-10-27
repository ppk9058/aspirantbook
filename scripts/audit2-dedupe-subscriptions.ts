/**
 * Idempotent cleanup for the A4 unique index on Subscription.providerId.
 *
 * Keeps the oldest subscription per providerId and repoints newer duplicate
 * payments/subscriptions' dependent rows to the kept one. It never deletes a
 * user, never truncates, and logs every change it makes.
 *
 * Run against the test DB before applying the migration:
 *   set -a; source .env.test; set +a
 *   APP_ENV=test DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="${TEST_DIRECT_URL:-$TEST_DATABASE_URL}" \
 *     npx tsx scripts/audit2-dedupe-subscriptions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const duplicates: Array<{ providerId: string; c: number }> = await prisma.$queryRawUnsafe(
    `SELECT "providerId", count(*)::int AS c
       FROM "Subscription"
      GROUP BY "providerId"
     HAVING count(*) > 1`
  );

  if (duplicates.length === 0) {
    console.log("[dedupe] no duplicate Subscription.providerId values; nothing to do");
    return;
  }

  for (const dup of duplicates) {
    const rows = await prisma.subscription.findMany({
      where: { providerId: dup.providerId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, userId: true },
    });
    if (rows.length < 2) continue;

    const keep = rows[0];
    const dropIds = rows.slice(1).map((r) => r.id);

    const repointed = await prisma.payment.updateMany({
      where: { subscriptionId: { in: dropIds } },
      data: { subscriptionId: keep.id },
    });

    const removed = await prisma.subscription.deleteMany({ where: { id: { in: dropIds } } });

    console.log(
      `[dedupe] providerId=${dup.providerId} kept=${keep.id} removed=${removed.count} paymentsRepointed=${repointed.count} duplicateIds=${dropIds.join(",")}`
    );
  }
}

main()
  .catch((err) => {
    console.error("[dedupe] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
