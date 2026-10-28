import { getPlatformSetting, PLATFORM_SETTING_KEYS } from "@/lib/platform-settings"

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

/**
 * B-006: cards are read from PlatformSetting (database), not from
 * data/homepage-cards.json. The old 60s in-process cache is gone too: it made
 * two serverless instances serve different homepage content.
 */
export async function getHomepagePromoCards(): Promise<HomepagePromoCard[]> {
  try {
    const data = await getPlatformSetting<Record<string, any>>(PLATFORM_SETTING_KEYS.homepageCards)
    if (!data || typeof data !== "object") return []

    const cards: HomepagePromoCard[] = []

    for (const [goalCategory, section] of Object.entries<any>(data)) {
      if (Array.isArray(section?.batches)) {
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
    return featuredPromos.length > 0 ? featuredPromos : cards.slice(0, 8)
  } catch (error) {
    console.error("Error reading homepage cards from the database:", error)
    return []
  }
}
