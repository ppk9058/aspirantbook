import { unstable_cache } from "next/cache";
import { CACHE_TAGS, safeRevalidateTags } from "@/lib/cache-tags";
import {
  getPlatformSetting,
  PLATFORM_SETTING_KEYS,
  updatePlatformSettingAtomic,
} from "@/lib/platform-settings";

export interface BatchTier {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  isPopular?: boolean;
  features: string[];
}

export interface BatchFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface BatchScheduleItem {
  day: string;
  subjects: string;
  time: string;
  type: string;
}

export interface BatchTeacher {
  name: string;
  role: string;
  subject: string;
  experience: string;
  qualification: string;
  avatar: string;
  bio?: string;
}

export interface BatchDemoVideo {
  title: string;
  subject: string;
  duration: string;
  teacher: string;
  thumbnail: string;
  videoUrl?: string;
}

export interface BatchFAQ {
  question: string;
  answer: string;
}

export interface BatchMoreDetail {
  title: string;
  description: string;
}

export interface Batch {
  id: string;
  slug: string;
  title: string;
  classTag: string; // e.g. "Class 6", "Class 10", "Skills"
  category: string; // e.g. "school-prep", "skills", "upsc", "bpsc"
  language: string; // e.g. "HINGLISH", "ENGLISH", "HINDI"
  targetText: string;
  scheduleText: string;
  startDate: string;
  endDate: string;
  durationText: string;
  validityText: string;
  price: string;
  originalPrice: string;
  discount: string;
  image: string;
  badge: string;
  buttonText?: string;
  buttonLink?: string;
  isPrimaryAction?: boolean;
  tiers: BatchTier[];
  aboutHighlights: string[];
  aboutDetails: string[];
  features: BatchFeature[];
  subjects: string[];
  weeklySchedule: BatchScheduleItem[];
  // Legacy optional aliases that still appear in data/batches.json (B-027).
  schedule?: BatchScheduleItem[];
  coverImage?: string | null;
  metadataJson?: string | null;
  teachers: BatchTeacher[];
  demoVideos: BatchDemoVideo[];
  faqs: BatchFAQ[];
  moreDetails?: BatchMoreDetail[];
  createdAt?: string;
  updatedAt?: string;
}

export const BATCHES_CACHE_TAG = CACHE_TAGS.batches;

/**
 * B-019: batches used to sit in a module-level 60s cache, so every serverless
 * instance served its own copy and a write was invisible to the others until
 * their TTL expired. Reads now go through Next's tagged data cache and every
 * mutation invalidates the tag, so all instances agree.
 */
async function readBatchesFileUncached(): Promise<Batch[]> {
  // B1: a read error must propagate. Returning [] here used to feed the
  // read-modify-write below, so one transient database error plus any write
  // erased every stored batch.
  const stored = await getPlatformSetting<Batch[]>(PLATFORM_SETTING_KEYS.batches);
  return Array.isArray(stored) ? stored : [];
}

const readBatchesCached = unstable_cache(readBatchesFileUncached, ["batches-json"], {
  tags: [BATCHES_CACHE_TAG],
  revalidate: 300,
});

let warnedAboutMissingCache = false;

async function readBatchesFile(): Promise<Batch[]> {
  try {
    return await readBatchesCached();
  } catch (error) {
    // unstable_cache needs a Next request scope. Scripts, CLIs and unit tests
    // have no incremental cache, so read straight from the database instead of
    // crashing (the tag is simply not cached there).
    if (!warnedAboutMissingCache) {
      warnedAboutMissingCache = true;
      console.warn(
        "[batches-service] Next data cache unavailable outside a request scope; reading uncached:",
        error instanceof Error ? error.message : error
      );
    }
    return readBatchesFileUncached();
  }
}

/**
 * B1: mutate the stored list under an advisory lock instead of writing a whole
 * array read earlier in the request. Concurrent creates/updates/deletes are
 * serialised and none of them is lost.
 */
async function mutateBatches<T>(
  mutate: (current: Batch[]) => { next: Batch[]; result: T }
): Promise<T> {
  let captured!: T;
  await updatePlatformSettingAtomic<Batch[]>(
    PLATFORM_SETTING_KEYS.batches,
    (current) => {
      const list = Array.isArray(current) ? current : [];
      const { next, result } = mutate(list);
      captured = result;
      return next;
    }
  );
  safeRevalidateTags(CACHE_TAGS.batches);
  return captured;
}

export async function getAllBatches(): Promise<Batch[]> {
  return await readBatchesFile();
}

export async function getBatchesByClass(classTag: string): Promise<Batch[]> {
  const batches = await readBatchesFile();
  if (!classTag || classTag.toLowerCase() === "all") {
    return batches;
  }
  return batches.filter(
    (b) => b.classTag.toLowerCase() === classTag.toLowerCase()
  );
}

export async function getBatchBySlug(slug: string): Promise<Batch | null> {
  const batches = await readBatchesFile();
  const normalized = slug.trim().toLowerCase();
  return (
    batches.find(
      (b) => b.slug.toLowerCase() === normalized || b.id.toLowerCase() === normalized
    ) || null
  );
}

export async function getBatchById(id: string): Promise<Batch | null> {
  const batches = await readBatchesFile();
  return batches.find((b) => b.id === id) || null;
}

export async function createBatch(data: Partial<Batch>): Promise<Batch> {
  const batches = await readBatchesFile();
  const slug =
    data.slug ||
    (data.title
      ? data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : `batch-${Date.now()}`);

  const newBatch: Batch = {
    id: data.id || slug || `batch-${Date.now()}`,
    slug,
    title: data.title || "Untitled Batch",
    classTag: data.classTag || "Class 6",
    category: data.category || "school-prep",
    language: data.language || "HINGLISH",
    targetText: data.targetText || `Targeted for students of ${data.classTag || "School"}`,
    scheduleText: data.scheduleText || "Starts soon",
    startDate: data.startDate || "Upcoming",
    endDate: data.endDate || "Ongoing",
    durationText: data.durationText || "Full Academic Year",
    validityText: data.validityText || "Until Exam Completion",
    price: data.price || "₹2,999",
    originalPrice: data.originalPrice || "₹4,999",
    discount: data.discount || "40% OFF",
    image: data.image || "/batch-green.svg",
    badge: data.badge || "ONLINE",
    buttonText: data.buttonText || "Buy Now",
    buttonLink: data.buttonLink || `/batches/${slug}`,
    isPrimaryAction: data.isPrimaryAction ?? true,
    tiers: data.tiers || [
      {
        id: "tier-regular",
        name: "Regular",
        price: data.price || "₹2,999",
        features: [
          "Live lectures with interactive doubts",
          "Daily Practice Problems (DPP) with solutions",
          "Comprehensive class notes (PDF)",
          "Regular tests & performance analytics"
        ],
      },
    ],
    aboutHighlights: data.aboutHighlights || [
      `Target: Students of ${data.classTag || "School"}`,
      "Full syllabus coverage for Board & Foundation exams",
      "Live interactive classes with instant doubts resolution",
    ],
    aboutDetails: data.aboutDetails || [
      "This course is meticulously designed by master educators to provide complete conceptual clarity and academic mastery.",
    ],
    features: data.features || [
      {
        title: "Live & Interactive Lectures",
        description: "Engaging classes taught by top national educators with high-retention audio-visual aids.",
      },
      {
        title: "Daily Practice Papers (DPPs)",
        description: "Curated problem sets after every lecture with detailed step-by-step video solutions.",
      },
    ],
    subjects: data.subjects || ["Mathematics", "Science", "Social Science", "English"],
    weeklySchedule: data.weeklySchedule || [
      { day: "Monday to Saturday", subjects: "Core Subjects", time: "04:30 PM - 07:30 PM", type: "Live Lectures" },
    ],
    teachers: data.teachers || [],
    demoVideos: data.demoVideos || [],
    faqs: data.faqs || [
      {
        question: "When will the batch start and end?",
        answer: "The batch schedule begins on the start date listed and recordings remain accessible until the validity date.",
      },
      {
        question: "Can I watch the lectures after they are streamed live?",
        answer: "Yes! All live sessions are immediately recorded and made available 24/7 in high definition with speed controls.",
      },
    ],
    moreDetails: data.moreDetails || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return mutateBatches((current) => {
    // Re-check inside the lock so a concurrent create cannot be overwritten.
    if (current.some((b) => b.id === newBatch.id)) {
      throw new Error(`Batch ${newBatch.id} already exists`);
    }
    return { next: [newBatch, ...current], result: newBatch };
  });
}

export async function updateBatch(
  id: string,
  data: Partial<Batch>
): Promise<Batch | null> {
  return mutateBatches((current) => {
    const index = current.findIndex((b) => b.id === id || b.slug === id);
    if (index === -1) return { next: current, result: null };

    const existing = current[index];
    const updated: Batch = {
      ...existing,
      ...data,
      id: existing.id, // Preserve immutable ID
      updatedAt: new Date().toISOString(),
    };

    const next = current.slice();
    next[index] = updated;
    return { next, result: updated };
  });
}

export async function deleteBatch(id: string): Promise<boolean> {
  return mutateBatches((current) => {
    const index = current.findIndex((b) => b.id === id || b.slug === id);
    if (index === -1) return { next: current, result: false };

    const next = current.filter((_, i) => i !== index);
    return { next, result: true };
  });
}
