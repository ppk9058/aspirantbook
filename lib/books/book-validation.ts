import { z } from "zod"
import { normalizeBookStorageKey } from "./book-file-storage"

const fileRef = z
  .string()
  .max(1000)
  .refine((value) => value === "" || normalizeBookStorageKey(value) !== null, {
    message: "File reference must be a storage key or a /uploads or /images path",
  })

/**
 * A5/A12: explicit allowlist for book updates. Unknown keys are stripped, so a
 * caller can never mass-assign fields such as createdBy or arbitrary JSON.
 */
export const bookUpdateSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    slug: z.string().min(1).max(300).optional(),
    subtitle: z.string().max(500).optional(),
    author: z.string().max(300).optional(),
    publisher: z.string().max(300).optional(),
    category: z.string().max(120).optional(),
    subcategory: z.string().max(120).optional(),
    subject: z.string().max(120).optional(),
    edition: z.string().max(120).optional(),
    price: z.coerce.number().min(0).optional(),
    originalPrice: z.coerce.number().min(0).optional(),
    mrp: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    ratingCount: z.coerce.number().int().min(0).optional(),
    reviewCount: z.coerce.number().int().min(0).optional(),
    salesCount: z.coerce.number().int().min(0).optional(),
    description: z.string().max(20000).optional(),
    shortDescription: z.string().max(2000).optional(),
    features: z.array(z.string().max(300)).max(100).optional(),
    highlights: z.array(z.string().max(300)).max(100).optional(),
    productDetails: z.any().optional(),
    whoCanBuy: z.string().max(2000).optional(),
    deliveryNote: z.string().max(2000).optional(),
    tableOfContents: z.any().optional(),
    pages: z.coerce.number().int().min(0).max(100000).optional(),
    fileSize: z.string().max(60).optional(),
    fileSizeMb: z.coerce.number().min(0).optional(),
    language: z.string().max(60).optional(),
    format: z.string().max(60).optional(),
    isBestseller: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    samplePdfUrl: fileRef.optional(),
    fullPdfUrl: fileRef.optional(),
    status: z.enum(["draft", "pending", "published", "rejected"]).optional(),
    tags: z.array(z.string().max(120)).max(50).optional(),
  })
  .strip()

export type BookUpdateInput = z.infer<typeof bookUpdateSchema>
