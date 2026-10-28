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
