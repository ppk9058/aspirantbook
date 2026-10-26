/**
 * Minimal Prisma entry point used by the S0 guard regression test.
 *
 * Importing this module is exactly what every api-v1 / contract / unit test and
 * every DB script does first: load the shared client. With a non-test
 * DATABASE_URL the guard in `lib/prisma.ts` must abort here, before any
 * connection is opened.
 */
import { prisma } from "@/lib/prisma"

async function main() {
  await prisma.$queryRaw`SELECT 1`
}

void main()
