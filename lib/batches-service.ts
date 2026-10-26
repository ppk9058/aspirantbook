import fs from "fs/promises";
import path from "path";
import { unstable_cache, revalidateTag } from "next/cache";

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
  teachers: BatchTeacher[];
  demoVideos: BatchDemoVideo[];
  faqs: BatchFAQ[];
  moreDetails?: BatchMoreDetail[];
  createdAt?: string;
  updatedAt?: string;
}

const BATCHES_FILE_PATH = path.join(process.cwd(), "data", "batches.json");

export const BATCHES_CACHE_TAG = "batches";

/**
 * B-019: batches used to sit in a module-level 60s cache, so every serverless
 * instance served its own copy and a write was invisible to the others until
 * their TTL expired. Reads now go through Next's tagged data cache and every
 * mutation invalidates the tag, so all instances agree.
 */
async function readBatchesFileUncached(): Promise<Batch[]> {
  try {
    const raw = await fs.readFile(BATCHES_FILE_PATH, "utf-8");
    return JSON.parse(raw) as Batch[];
  } catch (err) {
    console.error("Error reading batches.json:", err);
    return [];
  }
}

const readBatchesCached = unstable_cache(readBatchesFileUncached, ["batches-json"], {
  tags: [BATCHES_CACHE_TAG],
  revalidate: 300,
});

async function readBatchesFile(): Promise<Batch[]> {
  return readBatchesCached();
}

async function writeBatchesFile(batches: Batch[]): Promise<void> {
  await fs.mkdir(path.dirname(BATCHES_FILE_PATH), { recursive: true });
  await fs.writeFile(BATCHES_FILE_PATH, JSON.stringify(batches, null, 2), "utf-8");
  invalidateBatchesCache();
}

/**
 * Drops the shared batches cache entry after a mutation.
 * revalidateTag needs a Next request scope; outside one (scripts, unit tests)
 * the next read simply repopulates the cache, so we log instead of throwing.
 */
function invalidateBatchesCache(): void {
  try {
    revalidateTag(BATCHES_CACHE_TAG);
  } catch (error) {
    console.warn("[batches-service] revalidateTag skipped outside a request scope:", error);
  }
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

  batches.unshift(newBatch);
  await writeBatchesFile(batches);
  return newBatch;
}

export async function updateBatch(
  id: string,
  data: Partial<Batch>
): Promise<Batch | null> {
  const batches = await readBatchesFile();
  const index = batches.findIndex((b) => b.id === id || b.slug === id);
  if (index === -1) return null;

  const existing = batches[index];
  const updated: Batch = {
    ...existing,
    ...data,
    id: existing.id, // Preserve immutable ID
    updatedAt: new Date().toISOString(),
  };

  batches[index] = updated;
  await writeBatchesFile(batches);
  return updated;
}

export async function deleteBatch(id: string): Promise<boolean> {
  const batches = await readBatchesFile();
  const index = batches.findIndex((b) => b.id === id || b.slug === id);
  if (index === -1) return false;

  batches.splice(index, 1);
  await writeBatchesFile(batches);
  return true;
}
