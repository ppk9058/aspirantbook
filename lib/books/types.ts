export interface BookThumbnail {
  id: string
  label: string
  url: string
  type: "cover" | "back" | "contents" | "sample"
}

export type BookStatus = "draft" | "pending" | "published" | "rejected"

export interface BookProductDetail {
  label: string
  value: string
}

export interface BookCreatedBy {
  id: string
  role: "ADMIN" | "TEACHER" | "STUDENT" | string
  name: string
}

export interface Book {
  id: string
  slug: string
  title: string
  subtitle?: string
  author: string
  publisher: string
  category: string
  subcategory?: string
  subject: string
  edition: string
  // Pricing
  price: number
  originalPrice: number // alias or MRP
  mrp?: number // alias for originalPrice
  discountPercent: number
  // Reviews & ratings
  rating: number
  ratingCount: number
  reviewCount: number
  salesCount?: number
  // Media & Images
  coverImage: string
  images?: string[] // list of image URLs (up to 8, first is cover)
  thumbnails: BookThumbnail[]
  // Descriptions
  description: string
  shortDescription?: string
  features: string[]
  tableOfContents?: {
    section: string
    topics: string[]
  }[]
  // Detailed metadata
  productDetails?: BookProductDetail[]
  whoCanBuy?: string
  deliveryNote?: string
  highlights?: string[]
  // Specifications
  pages: number
  fileSize?: string
  fileSizeMb?: number
  language: string
  format: string
  // Status and Ownership
  status?: BookStatus
  createdBy?: BookCreatedBy
  rejectionReason?: string
  createdAt?: string
  updatedAt?: string
  // Flags & PDFs
  isBestseller?: boolean
  isFeatured?: boolean
  samplePdfUrl?: string
  fullPdfUrl?: string
  tags?: string[]
}

export interface CartItem {
  bookId: string
  book: Book
  quantity: number
  addedAt: string
}

export interface SavedItem {
  bookId: string
  book: Book
  savedAt: string
}

export interface Coupon {
  code: string
  title: string
  description: string
  discountType: "PERCENT" | "FLAT"
  value: number
  minCartValue: number
  /** null/undefined = unlimited redemptions. Enforced atomically by redeemCoupon(). */
  usageLimit?: number
  redemptions?: number
}

export type BookOrderStatus =
  | "pending_payment"
  | "completed"
  | "failed"
  | "COMPLETED"
  | "PROCESSING"

export interface BookOrder {
  id: string
  orderNumber: string
  date: string
  items: CartItem[]
  originalTotal: number
  discountTotal: number
  couponDiscount: number
  finalTotal: number
  couponCode?: string
  status: BookOrderStatus
  paymentMethod: string
  userId?: string
  userEmail?: string
  userName?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  paidAt?: string
}
