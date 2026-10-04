export interface BookThumbnail {
  id: string
  label: string
  url: string
  type: "cover" | "back" | "contents" | "sample"
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
  price: number
  originalPrice: number
  discountPercent: number
  rating: number
  ratingCount: number
  reviewCount: number
  coverImage: string
  thumbnails: BookThumbnail[]
  description: string
  shortDescription?: string
  features: string[]
  tableOfContents: {
    section: string
    topics: string[]
  }[]
  pages: number
  fileSize: string
  language: string
  format: string
  isBestseller?: boolean
  isFeatured?: boolean
  samplePdfUrl?: string
  fullPdfUrl?: string
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
}

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
  status: "COMPLETED" | "PROCESSING"
  paymentMethod: string
}
