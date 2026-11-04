import crypto from "crypto";
import { checkRateLimit } from "../../lib/rate-limit";
import { prisma } from "../../lib/prisma";
const key = `otp:send:phone:${crypto.createHash("sha256").update("+919876500040").digest("hex")}`;
(async () => {
  const rows = await prisma.rateLimit.findMany({ where: { key }, select: { key: true, count: true, windowStart: true } });
  console.log("DB rows for key:", JSON.stringify(rows));
  const res = await checkRateLimit(key, 3, 600, { failClosed: true });
  console.log("FRESH PROCESS checkRateLimit:", JSON.stringify(res));
  await prisma.$disconnect();
})();
