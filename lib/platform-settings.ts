import { prisma } from "@/lib/prisma"

/**
 * Platform-wide key/value settings (B-006 / S5).
 *
 * These used to live in `data/*.json`, which is per-instance and ephemeral on
 * serverless. The database row is now the only source of truth; there is no
 * in-process cache, because a cache is what made two instances disagree.
 */

export const PLATFORM_SETTING_KEYS = {
  homepageCards: "homepage-cards",
  batches: "batches",
  adminSettings: "admin-settings",
} as const

export type PlatformSettingKey =
  (typeof PLATFORM_SETTING_KEYS)[keyof typeof PLATFORM_SETTING_KEYS]

/** Returns the stored JSON value, or null when the key has never been written. */
export async function getPlatformSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } })
  return (row?.value ?? null) as T | null
}

/** Creates or replaces a setting. Returns the stored value. */
export async function setPlatformSetting(
  key: string,
  value: unknown,
  updatedBy?: string | null
): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as any, updatedBy: updatedBy ?? null },
    update: { value: value as any, updatedBy: updatedBy ?? null },
  })
}

export async function deletePlatformSetting(key: string): Promise<boolean> {
  const result = await prisma.platformSetting.deleteMany({ where: { key } })
  return result.count > 0
}
