import { Book, Coupon, BookOrder, BookOrderStatus } from "./types"
import { BOOKS_DATA, AVAILABLE_COUPONS } from "./data"
import { prisma } from "@/lib/prisma"

// B-005: books, orders and coupons live in Postgres (tables added in
// migration 20261026211635_phase3_persistence). This file used to read and write
// data/*.json, which is per-instance and read-only on serverless, so an order
// created on one instance was invisible on the next and coupon limits could be
// bypassed by replaying the write. The JSON files are now only the seed source
// (scripts/backfill-phase3.ts).

const INITIAL_ORDERS: BookOrder[] = [
  {
    id: "ord-1727371900001",
    orderNumber: "AB-ORD-928410",
    date: "26 Sep 2026, 04:15 PM",
    items: [
      {
        bookId: "bpsc-72nd-current-affairs-2026",
        book: BOOKS_DATA[2],
        quantity: 1,
        addedAt: "2026-09-26T10:40:00.000Z",
      },
    ],
    originalTotal: 599,
    discountTotal: 250,
    couponDiscount: 70,
    finalTotal: 279,
    couponCode: "EBOOK20",
    status: "COMPLETED",
    paymentMethod: "UPI / PhonePe",
  },
  {
    id: "ord-1727361900002",
    orderNumber: "AB-ORD-817290",
    date: "26 Sep 2026, 01:20 PM",
    items: [
      {
        bookId: "cbse-10-pyqs-past-10-years-2027",
        book: BOOKS_DATA[0],
        quantity: 1,
        addedAt: "2026-09-26T07:45:00.000Z",
      },
      {
        bookId: "cbse-10-rd-sharma-maths-2026",
        book: BOOKS_DATA[3],
        quantity: 1,
        addedAt: "2026-09-26T07:46:00.000Z",
      },
    ],
    originalTotal: 1749,
    discountTotal: 409,
    couponDiscount: 100,
    finalTotal: 1240,
    couponCode: "TOPPER100",
    status: "COMPLETED",
    paymentMethod: "Razorpay / Cards",
  },
  {
    id: "ord-1727351900003",
    orderNumber: "AB-ORD-739102",
    date: "25 Sep 2026, 08:50 PM",
    items: [
      {
        bookId: "cbse-10-pyq-bundle-2026",
        book: BOOKS_DATA[1],
        quantity: 1,
        addedAt: "2026-09-25T15:20:00.000Z",
      },
    ],
    originalTotal: 1546,
    discountTotal: 386,
    couponDiscount: 232,
    finalTotal: 928,
    couponCode: "EBOOK20",
    status: "COMPLETED",
    paymentMethod: "UPI / GooglePay",
  },
  {
    id: "ord-1727341900004",
    orderNumber: "AB-ORD-654819",
    date: "25 Sep 2026, 03:10 PM",
    items: [
      {
        bookId: "upsc-indian-polity-mindmaps-2026",
        book: BOOKS_DATA[4],
        quantity: 1,
        addedAt: "2026-09-25T09:30:00.000Z",
      },
    ],
    originalTotal: 799,
    discountTotal: 300,
    couponDiscount: 50,
    finalTotal: 449,
    couponCode: "FIRST50",
    status: "COMPLETED",
    paymentMethod: "NetBanking / HDFC",
  },
  {
    id: "ord-1727331900005",
    orderNumber: "AB-ORD-519283",
    date: "24 Sep 2026, 11:05 AM",
    items: [
      {
        bookId: "bpsc-72nd-bihar-special-gk-2026",
        book: BOOKS_DATA[5],
        quantity: 1,
        addedAt: "2026-09-24T05:35:00.000Z",
      },
    ],
    originalTotal: 499,
    discountTotal: 180,
    couponDiscount: 0,
    finalTotal: 319,
    status: "COMPLETED",
    paymentMethod: "UPI / Paytm",
  },
]

// Kept for API compatibility: there is no in-process cache any more.
export function invalidateBooksCache() {}
export function invalidateOrdersCache() {}

export function normalizeBook(raw: any): Book {
  const price = Number(raw.price) || 0
  const originalPrice = Number(raw.originalPrice ?? raw.mrp) || price
  const mrp = Number(raw.mrp ?? raw.originalPrice) || originalPrice
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  // Images list (ensure first image is coverImage)
  let images: string[] = Array.isArray(raw.images) && raw.images.length > 0 ? [...raw.images] : []
  if (images.length === 0 && raw.coverImage) {
    images = [raw.coverImage]
  } else if (images.length === 0 && Array.isArray(raw.thumbnails) && raw.thumbnails.length > 0) {
    images = raw.thumbnails.map((t: any) => t.url).filter(Boolean)
  }
  if (images.length === 0) {
    images = ["/images/books/cbse-10-solved-papers.svg"]
  }

  const coverImage = raw.coverImage || images[0] || "/images/books/cbse-10-solved-papers.svg"

  // Thumbnails array
  let thumbnails = Array.isArray(raw.thumbnails) && raw.thumbnails.length > 0
    ? raw.thumbnails
    : images.map((imgUrl, i) => ({
        id: `thumb-${i + 1}`,
        label: i === 0 ? "Cover Image" : `Preview Page ${i + 1}`,
        url: imgUrl,
        type: (i === 0 ? "cover" : "sample") as "cover" | "sample",
      }))

  const features = Array.isArray(raw.features) && raw.features.length > 0
    ? raw.features
    : Array.isArray(raw.highlights) && raw.highlights.length > 0
    ? raw.highlights
    : [
        "Instant eBook Delivery: Searchable and printable high-res PDF",
        "Strictly follows latest examination curriculum",
        "Step-by-step solved examples and marking scheme insights",
      ]

  const highlights = Array.isArray(raw.highlights) && raw.highlights.length > 0
    ? raw.highlights
    : features

  const productDetails = Array.isArray(raw.productDetails) && raw.productDetails.length > 0
    ? raw.productDetails
    : [
        { label: "Format", value: raw.format || "PDF eBook" },
        { label: "Pages", value: String(raw.pages || 240) },
        { label: "Language", value: raw.language || "English" },
        { label: "Publisher", value: raw.publisher || "aspirantbook Publications" },
        { label: "Edition", value: raw.edition || "2026 Edition" },
        { label: "File Size", value: raw.fileSize || `${raw.fileSizeMb || 18} MB` },
      ]

  const status = raw.status || "published" // legacy books are published by default
  const whoCanBuy = raw.whoCanBuy || `${raw.category || "Exam"} aspirants and students looking for comprehensive study material and solved papers.`
  const deliveryNote = raw.deliveryNote || "Digital PDF only. Instant online access, no physical copy, no shipping."

  return {
    ...raw,
    price,
    originalPrice,
    mrp,
    discountPercent,
    coverImage,
    images,
    thumbnails,
    features,
    highlights,
    productDetails,
    whoCanBuy,
    deliveryNote,
    status,
    pages: Number(raw.pages) || 240,
    language: raw.language || "English",
    edition: raw.edition || "2026 Edition",
    fileSize: raw.fileSize || `${raw.fileSizeMb || 18.5} MB`,
    fileSizeMb: raw.fileSizeMb || (raw.fileSize ? parseFloat(raw.fileSize) || 18.5 : 18.5),
    format: raw.format || "PDF eBook",
    salesCount: raw.salesCount ?? (raw.ratingCount ? raw.ratingCount * 12 : 0),
    rating: raw.rating ?? 4.8,
    ratingCount: raw.ratingCount ?? 1,
    reviewCount: raw.reviewCount ?? 1,
    createdAt: raw.createdAt || "2026-09-01T00:00:00.000Z",
    updatedAt: raw.updatedAt || new Date().toISOString(),
  }
}

// ----------------- ROW MAPPERS -----------------

type BookRow = {
  id: string
  slug: string
  title: string
  status: string
  price: number
  salesCount: number
  data: unknown
}

type OrderRow = {
  id: string
  orderNumber: string
  status: string
  finalTotal: number
  data: unknown
}

type CouponRow = {
  code: string
  title: string
  discountType: string
  value: number
  minCartValue: number
  usageLimit: number | null
  redemptions: number
  isActive: boolean
  data: unknown
}

function isCompletedStatus(status: string | undefined | null): boolean {
  return status === "completed" || status === "COMPLETED"
}

function bookRowToBook(row: BookRow): Book {
  const raw = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>
  return normalizeBook({
    ...raw,
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    price: row.price,
    salesCount: row.salesCount,
  })
}

function orderRowToOrder(row: OrderRow): BookOrder {
  const raw = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>
  return {
    ...(raw as unknown as BookOrder),
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status as BookOrderStatus,
    finalTotal: row.finalTotal,
  }
}

function couponRowToCoupon(row: CouponRow): Coupon {
  const raw = (row.data && typeof row.data === "object" ? row.data : {}) as Record<string, unknown>
  return {
    ...(raw as unknown as Coupon),
    code: row.code,
    title: row.title || (raw.title as string) || "",
    description: (raw.description as string) || "",
    discountType: (row.discountType as Coupon["discountType"]) || "PERCENT",
    value: row.value,
    minCartValue: row.minCartValue,
    usageLimit: row.usageLimit ?? undefined,
    redemptions: row.redemptions,
  }
}

// ----------------- BOOKS -----------------

/**
 * B3: built-in seed data may only stand in for the database in test/demo
 * environments. In production an empty table means "empty", never fabricated
 * books, coupons or revenue.
 */
function seedFallbackEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false
  return (
    process.env.NODE_ENV === "test" ||
    process.env.APP_ENV === "test" ||
    process.env.ENABLE_DEMO_DATA === "true"
  )
}

/** B3: only settled money counts as revenue. */
const PAID_ORDER_STATUSES = new Set(["completed", "paid"])

export function isPaidOrderStatus(status: string | null | undefined): boolean {
  if (typeof status !== "string") return false
  return PAID_ORDER_STATUSES.has(status.toLowerCase())
}

export async function getAllBooks(): Promise<Book[]> {
  const rows = await prisma.book.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }] })
  if (rows.length === 0 && seedFallbackEnabled()) {
    // Seed source only: an empty catalogue in a test/demo environment still
    // renders the built-in books instead of an empty storefront.
    return BOOKS_DATA.map(normalizeBook)
  }
  return rows.map(bookRowToBook)
}

export async function getBookById(id: string): Promise<Book | null> {
  if (!id) return null
  const row = await prisma.book.findUnique({ where: { id } })
  return row ? bookRowToBook(row) : null
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  if (!slug) return null
  const row = await prisma.book.findUnique({ where: { slug } })
  return row ? bookRowToBook(row) : null
}

export async function createBook(bookData: Partial<Book>): Promise<Book> {
  const id = bookData.id || `book-${Date.now()}`
  const slug =
    bookData.slug ||
    (bookData.title || `book-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  const price = Number(bookData.price) || 0
  const originalPrice = Number(bookData.originalPrice ?? bookData.mrp) || price
  const mrp = Number(bookData.mrp ?? bookData.originalPrice) || originalPrice
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const images = bookData.images && bookData.images.length > 0
    ? bookData.images
    : bookData.coverImage
    ? [bookData.coverImage]
    : ["/images/books/cbse-10-solved-papers.svg"]

  const coverImage = images[0]

  const thumbnails = bookData.thumbnails && bookData.thumbnails.length > 0
    ? bookData.thumbnails
    : images.map((url, idx) => ({
        id: `thumb-${Date.now()}-${idx + 1}`,
        label: idx === 0 ? "Cover Image" : `Sample Page ${idx + 1}`,
        url,
        type: (idx === 0 ? "cover" : "sample") as "cover" | "sample",
      }))

  const features = bookData.features && bookData.features.length > 0
    ? bookData.features
    : bookData.highlights && bookData.highlights.length > 0
    ? bookData.highlights
    : [
        "Instant eBook Delivery: Searchable and printable high-res PDF",
        "Strictly follows latest examination curriculum",
        "Step-by-step solved examples and marking scheme insights",
      ]

  const highlights = bookData.highlights && bookData.highlights.length > 0
    ? bookData.highlights
    : features

  const productDetails = bookData.productDetails && bookData.productDetails.length > 0
    ? bookData.productDetails
    : [
        { label: "Format", value: bookData.format || "PDF eBook" },
        { label: "Pages", value: String(bookData.pages || 240) },
        { label: "Language", value: bookData.language || "English" },
        { label: "Publisher", value: bookData.publisher || "aspirantbook Publications" },
        { label: "Edition", value: bookData.edition || "2026 Edition" },
        { label: "File Size", value: bookData.fileSize || `${bookData.fileSizeMb || 18.5} MB` },
      ]

  const nowIso = new Date().toISOString()

  const rawBook: Book = {
    id,
    slug,
    title: bookData.title || "Untitled eBook",
    subtitle: bookData.subtitle || "",
    author: bookData.author || "aspirantbook Academic Team",
    publisher: bookData.publisher || "aspirantbook Publications",
    category: bookData.category || "UPSC",
    subcategory: bookData.subcategory || "General",
    subject: bookData.subject || "General Studies",
    edition: bookData.edition || "2026 Edition",
    price,
    originalPrice,
    mrp,
    discountPercent,
    rating: bookData.rating || 4.8,
    ratingCount: bookData.ratingCount || 1,
    reviewCount: bookData.reviewCount || 1,
    salesCount: bookData.salesCount || 0,
    coverImage,
    images,
    thumbnails,
    description: bookData.description || "Comprehensive high-quality eBook designed for exam preparation.",
    shortDescription: bookData.shortDescription || "",
    features,
    highlights,
    productDetails,
    whoCanBuy: bookData.whoCanBuy || "All aspirants and students preparing for exams.",
    deliveryNote: bookData.deliveryNote || "Digital PDF only. Instant online access, no physical copy, no shipping.",
    tableOfContents: bookData.tableOfContents || [
      {
        section: "PART 1: CORE CONCEPTS",
        topics: ["Fundamental Overview", "Chapter-wise Diagnostic Test", "Solved Examples"],
      },
      {
        section: "PART 2: PRACTICE PAPERS",
        topics: ["Mock Exam Set 1", "Mock Exam Set 2", "Detailed Explanations"],
      },
    ],
    pages: Number(bookData.pages) || 240,
    fileSize: bookData.fileSize || `${bookData.fileSizeMb || 18.5} MB`,
    fileSizeMb: bookData.fileSizeMb || 18.5,
    language: bookData.language || "English",
    format: bookData.format || "PDF eBook",
    isBestseller: Boolean(bookData.isBestseller),
    isFeatured: Boolean(bookData.isFeatured),
    samplePdfUrl: bookData.samplePdfUrl || "",
    fullPdfUrl: bookData.fullPdfUrl || "",
    status: bookData.status || "draft",
    createdBy: bookData.createdBy,
    rejectionReason: bookData.rejectionReason,
    tags: bookData.tags || [],
    createdAt: bookData.createdAt || nowIso,
    updatedAt: nowIso,
  }

  const newBook = normalizeBook(rawBook)
  try {
    const row = await prisma.book.create({
      data: {
        id: newBook.id,
        slug: newBook.slug,
        title: newBook.title,
        status: newBook.status || "draft",
        price: newBook.price,
        salesCount: newBook.salesCount || 0,
        data: newBook as any,
      },
    })
    return bookRowToBook(row)
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error(`A book with the same ${Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "id or slug"} already exists`)
    }
    throw error
  }
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<Book | null> {
  const existingRow = await prisma.book.findUnique({ where: { id } })
  if (!existingRow) return null

  const existing = bookRowToBook(existingRow)
  const price = updates.price !== undefined ? Number(updates.price) : existing.price
  const originalPrice = updates.originalPrice !== undefined
    ? Number(updates.originalPrice)
    : updates.mrp !== undefined
    ? Number(updates.mrp)
    : existing.originalPrice
  const mrp = updates.mrp !== undefined ? Number(updates.mrp) : originalPrice
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const merged = {
    ...existing,
    ...updates,
    price,
    originalPrice,
    mrp,
    discountPercent,
    updatedAt: new Date().toISOString(),
  }

  const updatedBook = normalizeBook(merged)
  const row = await prisma.book.update({
    where: { id },
    data: {
      slug: updatedBook.slug,
      title: updatedBook.title,
      status: updatedBook.status || "draft",
      price: updatedBook.price,
      salesCount: updatedBook.salesCount || 0,
      data: updatedBook as any,
    },
  })
  return bookRowToBook(row)
}

export async function deleteBook(id: string): Promise<boolean> {
  const result = await prisma.book.deleteMany({ where: { id } })
  return result.count > 0
}

// ----------------- ORDERS -----------------

export async function getAllOrders(): Promise<BookOrder[]> {
  const rows = await prisma.bookOrder.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }] })
  // B3: never present seed orders as real ones outside test/demo.
  if (rows.length === 0 && seedFallbackEnabled()) return INITIAL_ORDERS
  return rows.map(orderRowToOrder)
}

export async function getOrderByOrderId(orderId: string): Promise<BookOrder | null> {
  if (!orderId) return null
  const row = await prisma.bookOrder.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
  })
  return row ? orderRowToOrder(row) : null
}

export async function getOrderByRazorpayId(rzpOrderId: string): Promise<BookOrder | null> {
  if (!rzpOrderId) return null
  const row = await prisma.bookOrder.findFirst({ where: { razorpayOrderId: rzpOrderId } })
  return row ? orderRowToOrder(row) : null
}

export async function getUserCompletedBooks(userId: string): Promise<string[]> {
  if (!userId) return []
  const rows = await prisma.bookOrder.findMany({
    where: { userId, status: { in: ["completed", "COMPLETED"] } },
    select: { data: true },
  })
  const bookIds = new Set<string>()
  for (const row of rows) {
    const order = (row.data && typeof row.data === "object" ? row.data : {}) as unknown as BookOrder
    for (const item of order.items || []) {
      const bId = item.bookId || item.book?.id
      if (bId) bookIds.add(bId)
    }
  }
  return Array.from(bookIds)
}

export async function hasUserPurchasedBook(userId: string, bookId: string): Promise<boolean> {
  if (!userId || !bookId) return false
  const ownedBooks = await getUserCompletedBooks(userId)
  return ownedBooks.includes(bookId)
}

export async function incrementBookSales(bookId: string, quantity = 1): Promise<void> {
  const delta = Math.max(1, quantity)
  await prisma.book.updateMany({
    where: { OR: [{ id: bookId }, { slug: bookId }] },
    data: { salesCount: { increment: delta } },
  })
}

export async function createOrder(orderData: BookOrder): Promise<BookOrder> {
  // Idempotent: the same order id (or order number) never creates a second row.
  const existing = await prisma.bookOrder.findFirst({
    where: { OR: [{ id: orderData.id }, { orderNumber: orderData.orderNumber }] },
  })
  if (existing) return orderRowToOrder(existing)

  // Ensure orders never start as completed from untrusted client input
  const safeOrder: BookOrder = {
    ...orderData,
    status: isCompletedStatus(orderData.status) ? "pending_payment" : (orderData.status || "pending_payment"),
  }

  try {
    const row = await prisma.bookOrder.create({
      data: {
        id: safeOrder.id,
        orderNumber: safeOrder.orderNumber,
        userId: safeOrder.userId ?? null,
        userEmail: safeOrder.userEmail ?? null,
        status: safeOrder.status,
        finalTotal: safeOrder.finalTotal || 0,
        razorpayOrderId: safeOrder.razorpayOrderId ?? null,
        razorpayPaymentId: safeOrder.razorpayPaymentId ?? null,
        data: safeOrder as any,
      },
    })
    return orderRowToOrder(row)
  } catch (error: any) {
    if (error?.code === "P2002") {
      const row = await prisma.bookOrder.findFirst({
        where: { OR: [{ id: safeOrder.id }, { orderNumber: safeOrder.orderNumber }] },
      })
      if (row) return orderRowToOrder(row)
    }
    throw error
  }
}

export async function markBookOrderCompleted({
  orderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  orderId: string
  razorpayPaymentId: string
  razorpaySignature?: string
}): Promise<{ success: boolean; alreadyCompleted?: boolean; order?: BookOrder; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.bookOrder.findFirst({
        where: { OR: [{ id: orderId }, { orderNumber: orderId }, { razorpayOrderId: orderId }] },
      })
      if (!row) return { success: false, error: "ORDER_NOT_FOUND" }

      const current = orderRowToOrder(row)
      // Idempotency: a repeated verify or webhook call must not double-count sales
      if (isCompletedStatus(current.status)) {
        return { success: true, alreadyCompleted: true, order: current }
      }

      // One payment id fulfils at most one order (also enforced by a unique index).
      const paymentOwner = await tx.bookOrder.findUnique({ where: { razorpayPaymentId } })
      if (paymentOwner && paymentOwner.id !== row.id) {
        return { success: false, error: "PAYMENT_ALREADY_USED" }
      }

      const next: BookOrder = {
        ...current,
        status: "completed",
        paidAt: new Date().toISOString(),
        razorpayPaymentId,
        ...(razorpaySignature ? { razorpaySignature } : {}),
      }

      // Atomic claim: exactly one caller can move the order out of pending.
      const claimed = await tx.bookOrder.updateMany({
        where: { id: row.id, status: { notIn: ["completed", "COMPLETED"] } },
        data: { status: "completed", razorpayPaymentId, data: next as any },
      })

      if (claimed.count === 0) {
        const fresh = await tx.bookOrder.findUnique({ where: { id: row.id } })
        return { success: true, alreadyCompleted: true, order: fresh ? orderRowToOrder(fresh) : current }
      }

      for (const item of next.items || []) {
        const bId = item.bookId || item.book?.id
        if (bId) {
          await tx.book.updateMany({
            where: { OR: [{ id: bId }, { slug: bId }] },
            data: { salesCount: { increment: Math.max(1, item.quantity || 1) } },
          })
        }
      }

      return { success: true, alreadyCompleted: false, order: next }
    })

    // Best effort, after the transaction: the payment is already captured, so a
    // coupon bookkeeping failure must not fail the order.
    if (result.success && !result.alreadyCompleted && result.order?.couponCode) {
      try {
        await redeemCoupon(result.order.couponCode)
      } catch (couponError) {
        console.error("Failed to record coupon redemption:", couponError)
      }
    }

    return result
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, error: "PAYMENT_ALREADY_USED" }
    }
    throw error
  }
}

export async function markBookOrderFailed(orderId: string): Promise<boolean> {
  const row = await prisma.bookOrder.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }, { razorpayOrderId: orderId }] },
  })
  if (!row) return false
  if (isCompletedStatus(row.status)) return false // do not override completed order

  const next: BookOrder = { ...orderRowToOrder(row), status: "failed" }
  const result = await prisma.bookOrder.updateMany({
    where: { id: row.id, status: { notIn: ["completed", "COMPLETED"] } },
    data: { status: "failed", data: next as any },
  })
  return result.count > 0
}

export async function updateOrderStatus(
  orderId: string,
  status: BookOrderStatus
): Promise<BookOrder | null> {
  const row = await prisma.bookOrder.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
  })
  if (!row) return null

  const next: BookOrder = { ...orderRowToOrder(row), status }
  const updated = await prisma.bookOrder.update({
    where: { id: row.id },
    data: { status, data: next as any },
  })
  return orderRowToOrder(updated)
}

// ----------------- COUPONS -----------------

export async function getAllCoupons(): Promise<Coupon[]> {
  const rows = await prisma.bookCoupon.findMany({ orderBy: [{ createdAt: "desc" }, { code: "asc" }] })
  if (rows.length === 0 && seedFallbackEnabled()) return AVAILABLE_COUPONS
  return rows.map(couponRowToCoupon)
}

export async function createCoupon(coupon: Coupon): Promise<Coupon> {
  const code = coupon.code.toUpperCase().trim()
  const normalized: Coupon = { ...coupon, code }
  const row = await prisma.bookCoupon.upsert({
    where: { code },
    create: {
      code,
      title: normalized.title || "",
      discountType: normalized.discountType || "PERCENT",
      value: Number(normalized.value) || 0,
      minCartValue: Number(normalized.minCartValue) || 0,
      usageLimit: typeof normalized.usageLimit === "number" ? normalized.usageLimit : null,
      redemptions: Number(normalized.redemptions) || 0,
      isActive: true,
      data: normalized as any,
    },
    update: {
      title: normalized.title || "",
      discountType: normalized.discountType || "PERCENT",
      value: Number(normalized.value) || 0,
      minCartValue: Number(normalized.minCartValue) || 0,
      usageLimit: typeof normalized.usageLimit === "number" ? normalized.usageLimit : null,
      data: normalized as any,
    },
  })
  return couponRowToCoupon(row)
}

export async function deleteCoupon(code: string): Promise<boolean> {
  const result = await prisma.bookCoupon.deleteMany({ where: { code: code.toUpperCase().trim() } })
  return result.count > 0
}

/**
 * Atomically consumes one redemption of a coupon.
 *
 * The remaining-usage check and the increment happen in a single UPDATE
 * (Prisma updateMany -> one SQL statement), so N parallel redemptions of a
 * coupon with usageLimit N produce exactly N successes and no more.
 */
export async function redeemCoupon(
  code: string
): Promise<{ success: boolean; coupon?: Coupon; reason?: "COUPON_NOT_FOUND" | "USAGE_LIMIT_REACHED" }> {
  const normalized = code.trim().toUpperCase()
  const row = await prisma.bookCoupon.findUnique({ where: { code: normalized } })
  if (!row || !row.isActive) return { success: false, reason: "COUPON_NOT_FOUND" }

  const result =
    row.usageLimit === null
      ? await prisma.bookCoupon.updateMany({
          where: { code: normalized, isActive: true },
          data: { redemptions: { increment: 1 } },
        })
      : await prisma.bookCoupon.updateMany({
          where: { code: normalized, isActive: true, redemptions: { lt: row.usageLimit } },
          data: { redemptions: { increment: 1 } },
        })

  if (result.count !== 1) return { success: false, reason: "USAGE_LIMIT_REACHED" }

  const fresh = await prisma.bookCoupon.findUnique({ where: { code: normalized } })
  return { success: true, coupon: fresh ? couponRowToCoupon(fresh) : undefined }
}

// ----------------- STATS -----------------

export async function getBookstoreStats() {
  const books = await getAllBooks()
  const orders = await getAllOrders()
  const coupons = await getAllCoupons()

  // B3: revenue counts settled orders only. A pending, failed or refunded
  // order must never inflate the bookstore's numbers.
  const paidOrders = orders.filter((o) => isPaidOrderStatus(o.status))
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0)
  const totalOrders = orders.length
  const completedOrders = paidOrders.length
  const avgOrderValue =
    paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0

  // Category breakdown
  const categoryCounts: { [cat: string]: number } = {}
  books.forEach((b) => {
    categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1
  })

  // Sales by book (calculated from orders)
  const bookSalesCount: { [id: string]: { book: Book; sales: number; revenue: number } } = {}
  paidOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const bId = item.bookId || item.book?.id
      if (!bId) return
      if (!bookSalesCount[bId]) {
        bookSalesCount[bId] = {
          book: item.book || books.find((b) => b.id === bId)!,
          sales: 0,
          revenue: 0,
        }
      }
      bookSalesCount[bId].sales += item.quantity || 1
      bookSalesCount[bId].revenue += (item.book?.price || 0) * (item.quantity || 1)
    })
  })

  const topSellingBooks = Object.values(bookSalesCount)
    .filter((entry) => Boolean(entry.book))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)

  return {
    totalBooks: books.length,
    totalOrders,
    completedOrders,
    totalRevenue,
    avgOrderValue,
    totalCoupons: coupons.length,
    categoryCounts,
    topSellingBooks,
    recentOrders: orders.slice(0, 8),
    paidOrders: paidOrders.length,
  }
}
