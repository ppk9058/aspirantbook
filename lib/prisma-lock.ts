import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

/**
 * B8: transaction-scoped Postgres advisory lock.
 *
 * Used to serialise "read the current maximum, then insert with max + 1" for
 * content ordering. Without a lock two concurrent creators read the same
 * maximum and both insert the same position, so chapters/lessons end up tied
 * and reordering becomes ambiguous.
 *
 * `pg_advisory_xact_lock` is released automatically when the transaction ends
 * (commit or rollback), so a crashed request cannot leave the key held.
 */
export async function acquireTransactionLock(
    tx: Prisma.TransactionClient,
    key: string
): Promise<void> {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, key)
}

/** Runs `fn` in a transaction that first holds the advisory lock for `key`. */
export async function withTransactionLock<T>(
    key: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
    return prisma.$transaction(
        async (tx) => {
            await acquireTransactionLock(tx, key)
            return fn(tx)
        },
        { maxWait: 10_000, timeout: 20_000 }
    )
}
