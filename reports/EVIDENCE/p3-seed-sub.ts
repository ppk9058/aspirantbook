import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findUnique({ where: { email: "fv.premium@example.test" } });
  if (!u) throw new Error("premium user missing");
  const sub = await prisma.subscription.upsert({
    where: { providerId: "fv-phase3-sub-1" },
    update: { status: "ACTIVE", endDate: new Date(Date.now() + 365 * 864e5) },
    create: {
      userId: u.id,
      plan: "MONTHLY",
      status: "ACTIVE",
      provider: "STRIPE",
      providerId: "fv-phase3-sub-1",
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 864e5),
    },
    select: { id: true, userId: true, status: true },
  });
  console.log(JSON.stringify(sub));
}
main().finally(() => prisma.$disconnect());
