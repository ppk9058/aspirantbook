/**
 * Real rating distribution from Review rows. No overrides, no seeded values.
 */
export interface RatingBucket {
  stars: 1 | 2 | 3 | 4 | 5
  count: number
  percent: number
}

export interface RatingDistribution {
  total: number
  average: number
  buckets: RatingBucket[]
  visible: boolean
}

export function deriveRatingDistribution(reviews: Array<{ rating: number }> | null | undefined): RatingDistribution {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  let sum = 0

  for (const review of reviews || []) {
    const rating = Number(review?.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue
    counts[rating] += 1
    total += 1
    sum += rating
  }

  const buckets: RatingBucket[] = ([5, 4, 3, 2, 1] as const).map((stars) => ({
    stars,
    count: counts[stars],
    percent: total > 0 ? Math.round((counts[stars] / total) * 100) : 0,
  }))

  return {
    total,
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    buckets,
    visible: total > 0,
  }
}
