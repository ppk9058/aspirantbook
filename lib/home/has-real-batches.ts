import { getPlatformSetting, PLATFORM_SETTING_KEYS } from "@/lib/platform-settings"
import { CLASS_TABS } from "@/components/home/homepage-courses.data"
import { filterRealSections, type SectionData } from "@/lib/home/real-batches"

/**
 * Server-side check that mirrors the exact condition ClassesCoursesSection
 * uses to render the homepage batch section:
 *   `!hasRealBatches || filteredTabs.length === 0` -> renders nothing.
 *
 * Server components compute this once and pass it down, so client components
 * never query the database just to decide where a link should point.
 */
export async function hasRealBatchesAvailable(): Promise<boolean> {
    try {
        const data = await getPlatformSetting<Record<string, SectionData>>(
            PLATFORM_SETTING_KEYS.homepageCards
        )
        const { hasRealBatches, filteredTabs } = filterRealSections(data, CLASS_TABS)
        return hasRealBatches && filteredTabs.length > 0
    } catch (error) {
        console.error("Failed to read homepage cards for anchor resolution:", error)
        // The homepage section also fails closed (renders nothing) on a read error.
        return false
    }
}
