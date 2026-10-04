import fs from "fs/promises"
import path from "path"
import { Book, Coupon, BookOrder } from "./types"
import { BOOKS_DATA, AVAILABLE_COUPONS } from "./data"

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
let cachedOrders: BookOrder[] | null = null
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

export async function getAllBooks(): Promise<Book[]> {
  try {
    await ensureDataFiles()
    const content = await fs.readFile(BOOKS_FILE, "utf-8")
    const books = JSON.parse(content) as Book[]
    cachedBooks = books
    return books
  } catch (err) {
    console.error("Error reading books.json:", err)
    return cachedBooks || BOOKS_DATA
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
  const originalPrice = Number(bookData.originalPrice) || price
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const newBook: Book = {
    id,
    slug,
    title: bookData.title || "Untitled eBook",
    subtitle: bookData.subtitle || "",
    author: bookData.author || "aspirantbook Academic Team",
    publisher: bookData.publisher || "aspirantbook Publications",
    category: bookData.category || "CBSE Class 10th Books",
    subcategory: bookData.subcategory || "General",
    subject: bookData.subject || "General Studies",
    edition: bookData.edition || "2026 Edition",
    price,
    originalPrice,
    discountPercent,
    rating: bookData.rating || 4.8,
    ratingCount: bookData.ratingCount || 1,
    reviewCount: bookData.reviewCount || 1,
    coverImage: bookData.coverImage || "/images/books/cbse-10-solved-papers.svg",
    thumbnails: bookData.thumbnails || [
      {
        id: `thumb-${Date.now()}-1`,
        label: "Front Cover",
        url: bookData.coverImage || "/images/books/cbse-10-solved-papers.svg",
        type: "cover",
      },
    ],
    description: bookData.description || "Comprehensive high-quality eBook designed for exam preparation.",
    shortDescription: bookData.shortDescription || "",
    features: bookData.features && bookData.features.length > 0 ? bookData.features : [
      "Instant eBook Delivery: Searchable and printable high-res PDF",
      "Strictly follows latest examination curriculum",
      "Step-by-step solved examples and marking scheme insights",
    ],
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
    fileSize: bookData.fileSize || "18.5 MB",
    language: bookData.language || "English",
    format: bookData.format || "eBook (High-Res PDF + Interactive Reader)",
    isBestseller: Boolean(bookData.isBestseller),
    isFeatured: Boolean(bookData.isFeatured),
    samplePdfUrl: bookData.samplePdfUrl || "",
    fullPdfUrl: bookData.fullPdfUrl || "",
  }

  const updated = [newBook, ...books]
  await fs.writeFile(BOOKS_FILE, JSON.stringify(updated, null, 2), "utf-8")
  cachedBooks = updated
  return newBook
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<Book | null> {
  await ensureDataFiles()
  const books = await getAllBooks()
  const idx = books.findIndex((b) => b.id === id)
  if (idx === -1) return null

  const existing = books[idx]
  const price = updates.price !== undefined ? Number(updates.price) : existing.price
  const originalPrice = updates.originalPrice !== undefined ? Number(updates.originalPrice) : existing.originalPrice
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  const updatedBook: Book = {
    ...existing,
    ...updates,
    price,
    originalPrice,
    discountPercent,
  }

  books[idx] = updatedBook
  await fs.writeFile(BOOKS_FILE, JSON.stringify(books, null, 2), "utf-8")
  cachedBooks = books
  return updatedBook
}

export async function deleteBook(id: string): Promise<boolean> {
  await ensureDataFiles()
  const books = await getAllBooks()
  const filtered = books.filter((b) => b.id !== id)
  if (filtered.length === books.length) return false

  await fs.writeFile(BOOKS_FILE, JSON.stringify(filtered, null, 2), "utf-8")
  cachedBooks = filtered
  return true
}

// ----------------- ORDERS -----------------

export async function getAllOrders(): Promise<BookOrder[]> {
  try {
    await ensureDataFiles()
    const content = await fs.readFile(ORDERS_FILE, "utf-8")
    const orders = JSON.parse(content) as BookOrder[]
    cachedOrders = orders
    return orders
  } catch (err) {
    console.error("Error reading book-orders.json:", err)
    return cachedOrders || INITIAL_ORDERS
  }
}

export async function createOrder(orderData: BookOrder): Promise<BookOrder> {
  await ensureDataFiles()
  const orders = await getAllOrders()
  const updated = [orderData, ...orders]
  await fs.writeFile(ORDERS_FILE, JSON.stringify(updated, null, 2), "utf-8")
  cachedOrders = updated
  return orderData
}

export async function updateOrderStatus(
  orderId: string,
  status: "COMPLETED" | "PROCESSING"
): Promise<BookOrder | null> {
  await ensureDataFiles()
  const orders = await getAllOrders()
  const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId)
  if (idx === -1) return null

  orders[idx].status = status
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8")
  cachedOrders = orders
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

  await fs.writeFile(COUPONS_FILE, JSON.stringify(updated, null, 2), "utf-8")
  cachedCoupons = updated
  return normalized
}

export async function deleteCoupon(code: string): Promise<boolean> {
  await ensureDataFiles()
  const coupons = await getAllCoupons()
  const filtered = coupons.filter((c) => c.code.toUpperCase() !== code.toUpperCase())
  if (filtered.length === coupons.length) return false

  await fs.writeFile(COUPONS_FILE, JSON.stringify(filtered, null, 2), "utf-8")
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
