import fs from "fs/promises"
import path from "path"
import { Book, Coupon, BookOrder, BookOrderStatus } from "./types"
import { BOOKS_DATA, AVAILABLE_COUPONS } from "./data"
import { atomicWriteJson, safeReadJson } from "./storage"

const DATA_DIR = path.join(process.cwd(), "data")
const BOOKS_FILE = path.join(DATA_DIR, "books.json")
const ORDERS_FILE = path.join(DATA_DIR, "book-orders.json")
const COUPONS_FILE = path.join(DATA_DIR, "book-coupons.json")

// Initial mock orders to provide immediate rich eCommerce analytics
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

// Cache management
let cachedBooks: Book[] | null = null
let lastBooksCacheTime = 0
const BOOKS_CACHE_TTL_MS = 10_000 // 10 seconds TTL

export function invalidateBooksCache() {
  cachedBooks = null
  lastBooksCacheTime = 0
}

let cachedOrders: BookOrder[] | null = null
let lastOrdersCacheTime = 0
const ORDERS_CACHE_TTL_MS = 10_000 // 10 seconds TTL

export function invalidateOrdersCache() {
  cachedOrders = null
  lastOrdersCacheTime = 0
}

let cachedCoupons: Coupon[] | null = null

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    await fs.access(BOOKS_FILE)
  } catch {
    await fs.writeFile(BOOKS_FILE, JSON.stringify(BOOKS_DATA, null, 2), "utf-8")
  }

  try {
    await fs.access(ORDERS_FILE)
  } catch {
    await fs.writeFile(ORDERS_FILE, JSON.stringify(INITIAL_ORDERS, null, 2), "utf-8")
  }

  try {
    await fs.access(COUPONS_FILE)
  } catch {
    await fs.writeFile(COUPONS_FILE, JSON.stringify(AVAILABLE_COUPONS, null, 2), "utf-8")
  }
}

// ----------------- BOOKS -----------------

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

export async function getAllBooks(): Promise<Book[]> {
  if (cachedBooks && Date.now() - lastBooksCacheTime < BOOKS_CACHE_TTL_MS) {
    return cachedBooks
  }

  try {
    await ensureDataFiles()
    const content = await fs.readFile(BOOKS_FILE, "utf-8")
    const books = JSON.parse(content) as any[]
    const normalized = books.map(normalizeBook)
    cachedBooks = normalized
    lastBooksCacheTime = Date.now()
    return normalized
  } catch (err) {
    console.error("Error reading books.json:", err)
    return (cachedBooks || BOOKS_DATA).map(normalizeBook)
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  const books = await getAllBooks()
  return books.find((b) => b.id === id) || null
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const books = await getAllBooks()
  return books.find((b) => b.slug === slug) || null
}

export async function createBook(bookData: Partial<Book>): Promise<Book> {
  await ensureDataFiles()
  const books = await getAllBooks()

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
  const updated = [newBook, ...books]
  await atomicWriteJson(BOOKS_FILE, updated)
  cachedBooks = updated
  lastBooksCacheTime = Date.now()
  return newBook
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<Book | null> {
  await ensureDataFiles()
  const books = await getAllBooks()
  const idx = books.findIndex((b) => b.id === id)
  if (idx === -1) return null

  const existing = books[idx]
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
  books[idx] = updatedBook
  await atomicWriteJson(BOOKS_FILE, books)
  cachedBooks = books
  lastBooksCacheTime = Date.now()
  return updatedBook
}

export async function deleteBook(id: string): Promise<boolean> {
  await ensureDataFiles()
  const books = await getAllBooks()
  const filtered = books.filter((b) => b.id !== id)
  if (filtered.length === books.length) return false

  await atomicWriteJson(BOOKS_FILE, filtered)
  cachedBooks = filtered
  lastBooksCacheTime = Date.now()
  return true
}

// ----------------- ORDERS -----------------

export async function getAllOrders(): Promise<BookOrder[]> {
  if (cachedOrders && Date.now() - lastOrdersCacheTime < ORDERS_CACHE_TTL_MS) {
    return cachedOrders
  }

  try {
    await ensureDataFiles()
    const orders = await safeReadJson<BookOrder[]>(ORDERS_FILE, INITIAL_ORDERS)
    cachedOrders = orders
    lastOrdersCacheTime = Date.now()
    return orders
  } catch (err) {
    console.error("Error reading book-orders.json:", err)
    return cachedOrders || INITIAL_ORDERS
  }
}

export async function getOrderByOrderId(orderId: string): Promise<BookOrder | null> {
  const orders = await getAllOrders()
  return orders.find((o) => o.id === orderId || o.orderNumber === orderId) || null
}

export async function getOrderByRazorpayId(rzpOrderId: string): Promise<BookOrder | null> {
  const orders = await getAllOrders()
  return orders.find((o) => o.razorpayOrderId === rzpOrderId) || null
}

export async function getUserCompletedBooks(userId: string): Promise<string[]> {
  if (!userId) return []
  const orders = await getAllOrders()
  const userCompleted = orders.filter(
    (o) =>
      o.userId === userId &&
      (o.status === "completed" || o.status === "COMPLETED")
  )
  const bookIds = new Set<string>()
  for (const ord of userCompleted) {
    for (const item of ord.items || []) {
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
  try {
    const books = await getAllBooks()
    const bookIndex = books.findIndex((b) => b.id === bookId || b.slug === bookId)
    if (bookIndex >= 0) {
      books[bookIndex].salesCount = (books[bookIndex].salesCount || 0) + Math.max(1, quantity)
      await atomicWriteJson(BOOKS_FILE, books)
      cachedBooks = books
      lastBooksCacheTime = Date.now()
    }
  } catch (err) {
    console.error(`Failed to increment sales count for book ${bookId}:`, err)
  }
}

export async function createOrder(orderData: BookOrder): Promise<BookOrder> {
  await ensureDataFiles()
  const orders = await getAllOrders()
  // Ensure orders never start as completed from untrusted client input
  const safeOrder: BookOrder = {
    ...orderData,
    status: orderData.status === "completed" || orderData.status === "COMPLETED"
      ? "pending_payment"
      : (orderData.status || "pending_payment"),
  }
  const updated = [safeOrder, ...orders]
  await atomicWriteJson(ORDERS_FILE, updated)
  cachedOrders = updated
  lastOrdersCacheTime = Date.now()
  return safeOrder
}

export async function markBookOrderCompleted({
  orderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  orderId: string
  razorpayPaymentId: string
  razorpaySignature?: string
}): Promise<{ success: boolean; alreadyCompleted?: boolean; order?: BookOrder }> {
  await ensureDataFiles()
  const orders = await getAllOrders()
  const idx = orders.findIndex(
    (o) => o.id === orderId || o.orderNumber === orderId || o.razorpayOrderId === orderId
  )
  if (idx === -1) {
    return { success: false }
  }

  const currentOrder = orders[idx]
  // Idempotency check: a repeated verify or webhook call must not double-count sales
  if (currentOrder.status === "completed" || currentOrder.status === "COMPLETED") {
    return { success: true, alreadyCompleted: true, order: currentOrder }
  }

  // Mark completed
  currentOrder.status = "completed"
  currentOrder.paidAt = new Date().toISOString()
  currentOrder.razorpayPaymentId = razorpayPaymentId
  if (razorpaySignature) {
    currentOrder.razorpaySignature = razorpaySignature
  }

  // Atomically persist orders
  await atomicWriteJson(ORDERS_FILE, orders)
  cachedOrders = orders
  lastOrdersCacheTime = Date.now()

  // Increment salesCount once for each book in the order
  for (const item of currentOrder.items || []) {
    const bId = item.bookId || item.book?.id
    if (bId) {
      await incrementBookSales(bId, item.quantity || 1)
    }
  }

  return { success: true, alreadyCompleted: false, order: currentOrder }
}

export async function markBookOrderFailed(orderId: string): Promise<boolean> {
  await ensureDataFiles()
  const orders = await getAllOrders()
  const idx = orders.findIndex(
    (o) => o.id === orderId || o.orderNumber === orderId || o.razorpayOrderId === orderId
  )
  if (idx === -1) return false
  if (orders[idx].status === "completed" || orders[idx].status === "COMPLETED") {
    return false // do not override completed order
  }
  orders[idx].status = "failed"
  await atomicWriteJson(ORDERS_FILE, orders)
  cachedOrders = orders
  lastOrdersCacheTime = Date.now()
  return true
}

export async function updateOrderStatus(
  orderId: string,
  status: BookOrderStatus
): Promise<BookOrder | null> {
  await ensureDataFiles()
  const orders = await getAllOrders()
  const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId)
  if (idx === -1) return null

  orders[idx].status = status
  await atomicWriteJson(ORDERS_FILE, orders)
  cachedOrders = orders
  lastOrdersCacheTime = Date.now()
  return orders[idx]
}

// ----------------- COUPONS -----------------

export async function getAllCoupons(): Promise<Coupon[]> {
  try {
    await ensureDataFiles()
    const content = await fs.readFile(COUPONS_FILE, "utf-8")
    const coupons = JSON.parse(content) as Coupon[]
    cachedCoupons = coupons
    return coupons
  } catch (err) {
    console.error("Error reading book-coupons.json:", err)
    return cachedCoupons || AVAILABLE_COUPONS
  }
}

export async function createCoupon(coupon: Coupon): Promise<Coupon> {
  await ensureDataFiles()
  const coupons = await getAllCoupons()
  // Replace if exists, else append
  const idx = coupons.findIndex((c) => c.code.toUpperCase() === coupon.code.toUpperCase())
  const normalized: Coupon = {
    ...coupon,
    code: coupon.code.toUpperCase().trim(),
  }

  let updated: Coupon[]
  if (idx >= 0) {
    coupons[idx] = normalized
    updated = [...coupons]
  } else {
    updated = [normalized, ...coupons]
  }

  await atomicWriteJson(COUPONS_FILE, updated)
  cachedCoupons = updated
  return normalized
}

export async function deleteCoupon(code: string): Promise<boolean> {
  await ensureDataFiles()
  const coupons = await getAllCoupons()
  const filtered = coupons.filter((c) => c.code.toUpperCase() !== code.toUpperCase())
  if (filtered.length === coupons.length) return false

  await atomicWriteJson(COUPONS_FILE, filtered)
  cachedCoupons = filtered
  return true
}

// ----------------- STATS -----------------

export async function getBookstoreStats() {
  const books = await getAllBooks()
  const orders = await getAllOrders()
  const coupons = await getAllCoupons()

  const totalRevenue = orders.reduce((sum, o) => sum + (o.finalTotal || 0), 0)
  const totalOrders = orders.length
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  // Category breakdown
  const categoryCounts: { [cat: string]: number } = {}
  books.forEach((b) => {
    categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1
  })

  // Sales by book (calculated from orders)
  const bookSalesCount: { [id: string]: { book: Book; sales: number; revenue: number } } = {}
  orders.forEach((o) => {
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
  }
}
