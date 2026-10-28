/**
 * Bounded-concurrency `map`.
 *
 * The daily analytics job used to `await` one course, then one user, in a
 * sequential loop: with a few thousand active learners a single run made
 * thousands of round trips and could exceed the request timeout. Running every
 * item at once instead would open one connection per item and exhaust the
 * pool, so work is dispatched in fixed-size waves.
 *
 * Results keep the input order. The first rejection is rethrown (via
 * Promise.all semantics inside each wave) after the in-flight items settle.
 */
export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
        throw new Error(`mapWithConcurrency: concurrency must be a positive integer (got ${concurrency})`)
    }

    const results = new Array<R>(items.length)
    let nextIndex = 0

    const runWorker = async () => {
        while (true) {
            const index = nextIndex++
            if (index >= items.length) return
            results[index] = await worker(items[index], index)
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
    await Promise.all(workers)
    return results
}

/**
 * B11: walks a table in pages instead of loading every id into memory.
 *
 * `fetchPage` is called with the last id of the previous page (undefined for the
 * first page) and must return at most `pageSize` rows in a stable id order. Each
 * page is processed with bounded concurrency before the next page is fetched, so
 * peak memory is one page and the number of open connections stays capped.
 *
 * Returns the number of rows processed.
 */
export async function forEachBatchedId(options: {
    pageSize: number
    concurrency: number
    fetchPage: (cursor: string | undefined, take: number) => Promise<Array<{ id: string }>>
    worker: (id: string, index: number) => Promise<unknown>
}): Promise<number> {
    const { pageSize, concurrency, fetchPage, worker } = options
    if (!Number.isInteger(pageSize) || pageSize < 1) {
        throw new Error(`forEachBatchedId: pageSize must be a positive integer (got ${pageSize})`)
    }

    let cursor: string | undefined
    let processed = 0

    while (true) {
        const page = await fetchPage(cursor, pageSize)
        if (page.length === 0) break

        await mapWithConcurrency(page, concurrency, (row, index) =>
            worker(row.id, processed + index)
        )
        processed += page.length

        cursor = page[page.length - 1].id
        if (page.length < pageSize) break
    }

    return processed
}
