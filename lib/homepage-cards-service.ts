import fs from "fs/promises"
import path from "path"

export interface HomepagePromoCard {
  id: string
  slug: string
  title: string
  classTag: string
  language?: string
  targetText?: string
  scheduleText?: string
  price: string
  originalPrice?: string
  discount?: string
  image: string
  buttonText?: string
  buttonLink: string
  isPrimaryAction?: boolean
  isLive?: boolean
  goalCategory: string
}

const CARDS_FILE_PATH = path.join(process.cwd(), "data", "homepage-cards.json")

let cachedPromos: HomepagePromoCard[] | null = null
let lastReadTime = 0
const CACHE_TTL_MS = 60000 // 60s cache

export async function getHomepagePromoCards(): Promise<HomepagePromoCard[]> {
  const now = Date.now()
  if (cachedPromos && now - lastReadTime < CACHE_TTL_MS) {
    return cachedPromos
  }

  try {
    const raw = await fs.readFile(CARDS_FILE_PATH, "utf-8")
    const data = JSON.parse(raw)

    const cards: HomepagePromoCard[] = []

    for (const [goalCategory, section] of Object.entries<any>(data)) {
      if (Array.isArray(section.batches)) {
        for (const batch of section.batches) {
          cards.push({
            id: batch.id,
            slug: batch.slug,
            title: batch.title,
            classTag: batch.classTag || "Course",
            language: batch.language,
            targetText: batch.targetText,
            scheduleText: batch.scheduleText,
            price: batch.price || "Free",
            originalPrice: batch.originalPrice,
            discount: batch.discount,
            image: batch.image || "/batch-blue.svg",
            buttonText: batch.buttonText || "Enroll Now",
            buttonLink: batch.buttonLink || `/courses/${batch.slug}`,
            isPrimaryAction: Boolean(batch.isPrimaryAction),
            isLive: Boolean(batch.isLive),
            goalCategory,
          })
        }
      }
    }

    // Filter to standout promotions (featured primary action or significant discounts first)
    const featuredPromos = cards.filter((c) => c.isPrimaryAction || Boolean(c.discount))
    const finalCards = featuredPromos.length > 0 ? featuredPromos : cards.slice(0, 8)

    cachedPromos = finalCards
    lastReadTime = now
    return finalCards
  } catch (error) {
    console.error("Error reading homepage-cards.json:", error)
    return []
  }
}
