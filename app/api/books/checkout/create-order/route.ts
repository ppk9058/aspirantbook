import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllBooks, getAllCoupons, createOrder, getUserCompletedBooks } from "@/lib/books/bookService"
import { razorpay } from "@/lib/payments/razorpay"
import { CartItem, BookOrder } from "@/lib/books/types"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

function computeCouponDiscount(code: string, subtotal: number, availableCoupons: any[]): number {
  if (!code) return 0
  const upper = code.trim().toUpperCase()
  if (upper === "TOPPER100") {
    return subtotal >= 499 ? 100 : 0
  }
  if (upper === "EBOOK20") {
    return subtotal >= 299 ? Math.min(200, Math.round(subtotal * 0.2)) : 0
  }
  if (upper === "FIRST50") {
    return subtotal >= 199 ? 50 : 0
  }
  const custom = availableCoupons.find((c) => c.code.toUpperCase() === upper)
  if (custom && subtotal >= custom.minCartValue) {
    if (custom.discountType === "PERCENT") {
      return Math.round((subtotal * custom.value) / 100)
    }
    return custom.value
  }
  return 0
}

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req)
    const rl = await checkRateLimit(`book_checkout_order:${clientIp}`, 15, 60)
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many checkout requests. Please try again in a moment." }, { status: 429 })
    }

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in to complete purchase." }, { status: 401 })
    }

    const requireEmailVerification =
      process.env.REQUIRE_EMAIL_VERIFICATION_FOR_PURCHASE === "true" ||
      req.headers.get("x-require-email-verification") === "true"

    if (requireEmailVerification) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      })
      if (!dbUser?.emailVerified) {
        return NextResponse.json(
          { error: "Please verify your email address before making a purchase.", code: "EMAIL_NOT_VERIFIED" },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const rawItems = Array.isArray(body?.items) ? body.items : []
    const couponCode = typeof body?.couponCode === "string" ? body.couponCode.trim() : undefined

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty. Please add at least one eBook." }, { status: 400 })
    }

    // 1. Fetch live books catalogue
    const allBooks = await getAllBooks()
    const ownedBookIds = await getUserCompletedBooks(userId)

    const resolvedCartItems: CartItem[] = []
    let computedOriginalTotal = 0
    let computedSubtotal = 0

    for (const item of rawItems) {
      const bookId = item.bookId || item.id
      const quantity = Math.max(1, Number(item.quantity) || 1)
      const book = allBooks.find((b) => b.id === bookId || b.slug === bookId)

      if (!book) {
        return NextResponse.json(
          { error: `eBook with ID "${bookId}" was not found in our catalogue.` },
          { status: 400 }
        )
      }

      // Check if user already owns this book
      if (ownedBookIds.includes(book.id)) {
        return NextResponse.json(
          {
            error: "ALREADY_OWNED",
            bookId: book.id,
            bookTitle: book.title,
            message: `You already own "${book.title}". You can read or download it directly from My Orders.`,
          },
          { status: 409 }
        )
      }

      const originalPrice = book.mrp || book.originalPrice || book.price
      const sellingPrice = book.price

      computedOriginalTotal += originalPrice * quantity
      computedSubtotal += sellingPrice * quantity

      resolvedCartItems.push({
        bookId: book.id,
        book,
        quantity,
        addedAt: new Date().toISOString(),
      })
    }

    // 2. Validate coupon and calculate discount strictly server-side
    const availableCoupons = await getAllCoupons()
    let couponDiscount = 0
    if (couponCode) {
      couponDiscount = computeCouponDiscount(couponCode, computedSubtotal, availableCoupons)
    }

    const discountTotal = Math.max(0, computedOriginalTotal - computedSubtotal)
    const finalTotal = Math.max(1, computedSubtotal - couponDiscount) // Razorpay minimum is 1 INR
    const amountPaise = finalTotal * 100

    const orderId = `ord-${Date.now()}`
    const orderNumber = `AB-ORD-${Math.floor(100000 + Math.random() * 900000)}`

    // 3. Create Razorpay order
    let razorpayOrderId = `order_mock_${Date.now()}`
    if (razorpay) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: amountPaise,
          currency: "INR",
          receipt: orderId,
          notes: {
            orderId,
            userId,
            type: "book_order",
          },
        })
        razorpayOrderId = rzpOrder.id
      } catch (rzpErr: any) {
        console.error("Razorpay order creation error:", rzpErr)
        // If razorpay failed (e.g. invalid credentials or sandbox network issue), return error
        return NextResponse.json(
          { error: rzpErr.message || "Failed to initialize payment gateway order" },
          { status: 502 }
        )
      }
    }

    // 4. Save BookOrder with status "pending_payment"
    const bookOrder: BookOrder = {
      id: orderId,
      orderNumber,
      date: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: resolvedCartItems,
      originalTotal: computedOriginalTotal,
      discountTotal,
      couponDiscount,
      finalTotal,
      couponCode: couponDiscount > 0 ? couponCode : undefined,
      status: "pending_payment",
      paymentMethod: "UPI / Razorpay Instant eBook Access",
      userId,
      userEmail: session.user.email || undefined,
      userName: session.user.name || undefined,
      razorpayOrderId,
    }

    await createOrder(bookOrder)

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      razorpayOrderId,
      amount: finalTotal,
      amountPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
      bookNames: resolvedCartItems.map((i) => i.book.title),
      user: {
        name: session.user.name || "",
        email: session.user.email || "",
      },
    })
  } catch (err: any) {
    console.error("Error creating book checkout order:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
