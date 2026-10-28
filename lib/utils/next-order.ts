import type { Prisma } from "@prisma/client"

import { acquireTransactionLock } from "@/lib/prisma-lock"

/**
 * B8: allocate the next chapter/lesson position while holding the parent row's
 * advisory lock.
 *
 * Both callers used to do `findFirst(order desc)` and then `create(order + 1)` as
 * two independent statements. Two admins (or a double click) creating at the
 * same moment read the same maximum and inserted duplicate positions.
 *
 * The lock key is the parent id, so chapters of different courses and lessons of
 * different chapters still proceed in parallel. Must be called inside the same
 * transaction as the insert it is allocating for.
 */

export async function nextChapterOrder(
    tx: Prisma.TransactionClient,
    courseId: string
): Promise<number> {
    await acquireTransactionLock(tx, `chapter-order:${courseId}`)
    const maxOrder = await tx.chapter.findFirst({
        where: { courseId },
        orderBy: { order: "desc" },
        select: { order: true },
    })
    return (maxOrder?.order ?? -1) + 1
}

export async function nextLessonOrder(
    tx: Prisma.TransactionClient,
    chapterId: string
): Promise<number> {
    await acquireTransactionLock(tx, `lesson-order:${chapterId}`)
    const maxOrder = await tx.lesson.findFirst({
        where: { chapterId },
        orderBy: { order: "desc" },
        select: { order: true },
    })
    return (maxOrder?.order ?? -1) + 1
}
