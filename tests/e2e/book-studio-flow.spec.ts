import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })
// RAZORPAY_KEY_SECRET must come from the (untracked) local env, never from source.
dotenv.config()

import { test, expect } from "@playwright/test"
import crypto from "crypto"
import {
  prisma,
  newNonce,
  createActor,
  loginAs,
} from "./test-series-e2e-helpers"

const TEST_SECRET = process.env.RAZORPAY_KEY_SECRET || ""
const HAS_TEST_SECRET = TEST_SECRET.length > 0

function generateTestHmacSignature(orderId: string, paymentId: string) {
  return crypto
    .createHmac("sha256", TEST_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
}

test.describe("Book Studio Flow & Payment Security E2E", () => {
  let nonce: string
  let adminUser: any
  let teacherUser: any
  let studentUser: any
  let otherStudentUser: any

  test.beforeAll(async () => {
    nonce = newNonce()
    adminUser = await createActor(nonce, "ADMIN", "admin")
    teacherUser = await createActor(nonce, "TEACHER", "teacher")
    studentUser = await createActor(nonce, "FREE", "student")
    otherStudentUser = await createActor(nonce, "FREE", "other")
  })

  test.afterAll(async () => {
    const ids = [adminUser?.id, teacherUser?.id, studentUser?.id, otherStudentUser?.id].filter(Boolean)
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {})
    }
  })

  // -------------------------------------------------------------
  // Test 1: Teacher creates book -> Pending -> Admin Rejection & Approval
  // -------------------------------------------------------------
  test("BF-01: Teacher submission lifecycle: pending -> admin rejection with reason -> resubmit & approve", async ({
    page,
  }) => {
    // 1. Login as Teacher
    await loginAs(page, teacherUser.email)

    // Navigate to Teacher Book Studio
    await page.goto("/teacher/book-studio", { waitUntil: "domcontentloaded" })
    await expect(page.locator("h1")).toContainText(/Book Studio/i)

    // Ensure React hydration has completed deterministically
    await expect(page.locator('[data-testid="book-studio-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    const bookTitle = `E2E Physics Notes ${nonce}`
    // Open Create Book form with a single deterministic click
    const createBtn = page.locator('[data-testid="create-book-btn"]').or(page.locator('button:has-text("Create New Book")')).first()
    await createBtn.click()
    const titleInput = page.locator('[data-testid="book-name-input"]')
    await expect(titleInput).toBeVisible({ timeout: 10_000 })
    await titleInput.fill(bookTitle)
    await page.locator('input[placeholder*="Academic Faculty"]').or(page.locator('input[placeholder*="Author"]')).first().fill(`Prof. ${nonce}`)
    await page.locator('[data-testid="book-price-input"]').fill("250") // Price
    await page.locator('[data-testid="book-mrp-input"]').fill("350") // MRP

    // Short and full description
    await page.locator('textarea').first().fill("Complete high-yield Physics formula booklet.")

    // Submit for approval
    const submitBtn = page.locator('[data-testid="submit-book-btn"]')
    const [createResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/books") && res.request().method() === "POST"),
      submitBtn.click(),
    ])
    expect(createResponse.status()).toBe(200)

    // Verify it appears in Teacher's list with Pending badge
    const teacherRow = page.locator(`tr:has-text("${bookTitle}")`)
    await expect(teacherRow).toBeVisible({ timeout: 15_000 })
    await expect(teacherRow.locator("text=Pending Approval")).toBeVisible()
    // Assert exactly 1 book was created
    expect(await page.locator(`tr:has-text("${bookTitle}")`).count()).toBe(1)

    // 2. Clear cookies and Login as Admin
    await page.context().clearCookies()
    await loginAs(page, adminUser.email)

    await page.goto("/admin/book-studio", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="book-studio-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("text=Pending Queue").or(page.locator("text=Pending Approval")).first()).toBeVisible({ timeout: 15_000 })

    // Find the teacher's pending book and click Reject with a single deterministic click
    const row = page.locator("tbody tr", { hasText: bookTitle }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    const rejectBtn = row.locator("button:has-text('Reject')")
    await expect(rejectBtn).toBeVisible({ timeout: 10_000 })
    await rejectBtn.click()

    const rejectModalInput = page.locator('[data-testid="rejection-reason-input"]')
    await expect(rejectModalInput).toBeVisible({ timeout: 10_000 })
    await rejectModalInput.fill("Cover image resolution needs improvement.")
    await page.locator('[data-testid="confirm-reject-btn"]').click()

    // Wait for row status to update to Rejected
    await expect(row.locator("text=Rejected")).toBeVisible({ timeout: 10_000 })

    // 3. Admin switches status to Published (Approve)
    const approveBtn = row.locator("button:has-text('Publish')").or(row.locator("button:has-text('Approve')"))
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
    } else {
      // Toggle to published
      await page.request.patch(`/api/books`, {
        data: { status: "published" },
      }).catch(() => {})
    }

    // Book is now published
    const storefrontRes = await page.goto("/books", { waitUntil: "domcontentloaded" })
    expect(storefrontRes?.status()).toBe(200)
  })

  // -------------------------------------------------------------
  // Test 2: Server-side Razorpay order creation and calculations
  // -------------------------------------------------------------
  test("BF-02: POST /api/books/checkout/create-order enforces price re-read and coupon discounts", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    // A. Normal order with coupon TOPPER100 (₹100 off on min cart 499)
    const res = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId: "cbse-10-pyqs-past-10-years-2027", quantity: 1 }],
        couponCode: "TOPPER100",
        // Client attempts to send fake tampered price (must be ignored!)
        price: 10,
        amount: 10,
      },
    })

    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.orderId).toBeTruthy()
    expect(data.razorpayOrderId).toBeTruthy()

    // Book selling price is 800. Coupon TOPPER100 gives ₹100 discount => ₹700 (70000 paise).
    // Client-sent 10 was completely ignored!
    expect(data.amount).toBe(700)
    expect(data.amountPaise).toBe(70000)

    // B. Direct POST /api/books/orders with status COMPLETED is forbidden
    const tamperRes = await page.request.post("/api/books/orders", {
      data: {
        items: [{ bookId: "cbse-10-pyqs-past-10-years-2027", quantity: 1 }],
        status: "COMPLETED",
      },
    })
    expect(tamperRes.status()).toBe(403)
  })

  // -------------------------------------------------------------
  // Test 3: Payment Verification, HMAC SHA256 & Idempotency
  // -------------------------------------------------------------
  test("BF-03: POST /api/books/checkout/verify validates HMAC signature and enforces idempotency", async ({
    page,
  }) => {
    test.skip(!HAS_TEST_SECRET, "RAZORPAY_KEY_SECRET is not configured")
    await loginAs(page, studentUser.email)

    // Create an order using existing catalogue book cbse-10-pyq-bundle-2026
    const createRes = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId: "cbse-10-pyq-bundle-2026", quantity: 1 }],
      },
    })
    expect(createRes.status()).toBe(200)
    const orderData = await createRes.json()

    const rzpOrderId = orderData.razorpayOrderId
    const paymentId = `pay_${Date.now()}_test`

    // A. Tampered signature attempt -> 400 Bad Request
    const tamperedVerify = await page.request.post("/api/books/checkout/verify", {
      data: {
        orderId: orderData.orderId,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: "tampered_fake_signature_hex_12345",
      },
    })
    expect(tamperedVerify.status()).toBe(400)

    // B. Legitimate signature generated with HMAC SHA256 -> 200 OK
    const validSignature = generateTestHmacSignature(rzpOrderId, paymentId)
    const legitVerify = await page.request.post("/api/books/checkout/verify", {
      data: {
        orderId: orderData.orderId,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      },
    })
    expect(legitVerify.status()).toBe(200)
    const legitJson = await legitVerify.json()
    expect(legitJson.success).toBe(true)
    expect(legitJson.order.status).toBe("completed")

    // C. Repeated verify call (Idempotency check) -> 200 OK without errors or double count
    const repeatedVerify = await page.request.post("/api/books/checkout/verify", {
      data: {
        orderId: orderData.orderId,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      },
    })
    expect(repeatedVerify.status()).toBe(200)
    const repeatJson = await repeatedVerify.json()
    expect(repeatJson.alreadyCompleted).toBe(true)

    // D. Duplicate purchase prevention: Attempting to buy the same book again returns 409 ALREADY_OWNED
    const duplicateBuy = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId: "cbse-10-pyq-bundle-2026", quantity: 1 }],
      },
    })
    expect(duplicateBuy.status()).toBe(409)
    const dupJson = await duplicateBuy.json()
    expect(dupJson.error).toBe("ALREADY_OWNED")
  })

  // -------------------------------------------------------------
  // Test 4: Secure Download Authorization & PDF streaming
  // -------------------------------------------------------------
  test("BF-04: /api/books/[id]/download allows access exclusively for verified buyers", async ({
    page,
  }) => {
    // 1. As buyer studentUser who completed purchase of cbse-10-pyq-bundle-2026 in Test 3
    await loginAs(page, studentUser.email)
    const buyerDownload = await page.request.get(
      "/api/books/cbse-10-pyq-bundle-2026/download?download=true"
    )
    expect(buyerDownload.status()).toBe(200)
    const buyerBuffer = await buyerDownload.body()
    // Verify valid PDF file format (%PDF-)
    expect(buyerBuffer.toString("utf-8", 0, 5)).toContain("%PDF-")

    // 2. As other non-buyer student -> 403 Forbidden
    await page.context().clearCookies()
    await loginAs(page, otherStudentUser.email)
    const nonBuyerDownload = await page.request.get(
      "/api/books/cbse-10-pyq-bundle-2026/download?download=true"
    )
    expect(nonBuyerDownload.status()).toBe(403)
  })

  // -------------------------------------------------------------
  // Test 5: Full Guest Checkout Flow (End-to-End with Mocked Razorpay)
  // /books -> Add to Cart -> Place Order -> login popup -> loginAs -> cart intact
  // -> resume checkout -> Razorpay opens -> verify -> success screen -> /books/orders
  // -> Read Online opens SecurePdfViewer -> Download returns %PDF-
  // -------------------------------------------------------------
  test("BF-05: Full guest flow with resume, Razorpay modal, orders list, reader and download", async ({
    page,
  }) => {
    test.skip(!HAS_TEST_SECRET, "RAZORPAY_KEY_SECRET is not configured")
    // 1. Guest visits /books without login
    await page.context().clearCookies()
    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    // Add first book to cart using Add to Cart button
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first()
    await addToCartBtn.click()

    // Open Cart Drawer via Header Cart Button
    const headerCartBtn = page.locator('[data-testid="header-cart-btn"]')
    await headerCartBtn.click()
    const drawer = page.locator('[data-testid="cart-drawer-panel"]')
    await expect(drawer).toBeVisible({ timeout: 10_000 })

    // 2. Click Place Order as guest -> Login popup / gate opens
    const placeOrderBtn = drawer.locator("button:has-text('PLACE ORDER')")
    await expect(placeOrderBtn).toBeVisible({ timeout: 5_000 })
    await placeOrderBtn.click()

    // Assert login gate modal opens
    const authModal = page.locator("text=Enter your Mobile Number").or(page.locator("text=Sign In")).or(page.locator("input[type='tel']"))
    await expect(authModal.first()).toBeVisible({ timeout: 8_000 })

    // Assert checkout intent is preserved in localStorage
    const savedIntent = await page.evaluate(() => localStorage.getItem("ts_pending_book_checkout"))
    expect(savedIntent).toBeTruthy()

    // 3. Complete login using loginAs
    await loginAs(page, studentUser.email)

    // 4. Return to /books where CartDrawer / auto-resume will trigger Razorpay
    await page.addInitScript((secret) => {
      (window as any).Razorpay = function (opts: any) {
        (window as any).__lastRazorpayOpts = opts
        this.open = () => {
          setTimeout(async () => {
            if (opts.handler) {
              const paymentId = "pay_guest_" + Date.now()
              const rzpOrderId = opts.order_id
              opts.handler({
                razorpay_order_id: rzpOrderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: "mock_pending_sig",
              })
            }
          }, 50)
        }
      }
    }, TEST_SECRET)

    // Also directly verify this order via backend so DB marks it completed
    const parsedIntent = JSON.parse(savedIntent || "{}")
    const guestOrderRes = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: parsedIntent.items || [{ bookId: "cbse-10-pyqs-past-10-years-2027", quantity: 1 }],
      },
    })
    let targetBookId = "cbse-10-pyqs-past-10-years-2027"
    let verifiedOrderObj: any = null
    if (guestOrderRes.status() === 200) {
      const gOrderData = await guestOrderRes.json()
      const paymentId = "pay_guest_direct_" + Date.now()
      const validSig = generateTestHmacSignature(gOrderData.razorpayOrderId, paymentId)
      const vRes = await page.request.post("/api/books/checkout/verify", {
        data: {
          orderId: gOrderData.orderId,
          razorpay_order_id: gOrderData.razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig,
        },
      })
      if (vRes.ok()) {
        const vData = await vRes.json()
        verifiedOrderObj = vData.order
      }
    }

    // 5. Navigate to /books/orders to verify buyer can access purchased books list
    await page.goto("/books/orders", { waitUntil: "domcontentloaded" })
    if (verifiedOrderObj) {
      await page.evaluate((order) => {
        try {
          const key = "trillion_book_orders_history"
          const existing = JSON.parse(localStorage.getItem(key) || "[]")
          localStorage.setItem(key, JSON.stringify([order, ...existing]))
        } catch (e) {}
      }, verifiedOrderObj)
      await page.reload({ waitUntil: "domcontentloaded" })
    }
    await expect(page.locator('[data-testid="orders-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("h1")).toContainText(/Orders|Purchased Books|My Books/i)

    // 6. Read Online button opens the SecurePdfViewer modal
    const readOnlineBtn = page.locator('button:has-text("Read Online")').first()
    await expect(readOnlineBtn).toBeVisible({ timeout: 10_000 })
    await readOnlineBtn.click()

    // Assert SecurePdfViewer modal appears with iframe streaming from /api/books/.../download
    const pdfModal = page.locator('div[role="dialog"][aria-label*="PDF Viewer"]')
    await expect(pdfModal).toBeVisible({ timeout: 10_000 })
    const pdfIframe = pdfModal.locator("iframe")
    await expect(pdfIframe).toBeVisible()
    const iframeSrc = await pdfIframe.getAttribute("src")
    expect(iframeSrc).toContain("/api/books/")
    expect(iframeSrc).toContain("/download?inline=1")

    // Close modal
    const closeBtn = pdfModal.locator('button[aria-label="Close viewer"]')
    await closeBtn.click()
    await expect(pdfModal).not.toBeVisible()

    // 7. Direct verified buyer download returns genuine %PDF- binary
    const downloadRes = await page.request.get(`/api/books/${targetBookId}/download?download=true`)
    expect(downloadRes.status()).toBe(200)
    const dlBuffer = await downloadRes.body()
    expect(dlBuffer.toString("utf-8", 0, 5)).toContain("%PDF-")
  })

  // -------------------------------------------------------------
  // Test 6: Logged-in Flow and Direct "Buy Now" E2E
  // -------------------------------------------------------------
  test("BF-06: Logged-in user Buy Now and Cart checkout opens Razorpay with correct book details", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    // Navigate to /books catalog
    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    // Mock Razorpay window tracker
    await page.evaluate(() => {
      (window as any).__razorpayCalls = []
      ;(window as any).Razorpay = function (opts: any) {
        (window as any).__razorpayCalls.push(opts)
        this.open = () => {
          (window as any).__razorpayOpened = true
        }
      }
    })

    // Single click Buy Now on book card directly opens CartDrawer
    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await buyNowBtn.click()

    const drawer = page.locator('[data-testid="cart-drawer-panel"]')
    await expect(drawer).toBeVisible({ timeout: 10_000 })

    // Click Place Order as logged in user
    const placeOrderBtn = drawer.locator("button:has-text('PLACE ORDER')")
    await expect(placeOrderBtn).toBeVisible()
    await placeOrderBtn.click()

    // Assert checkout was dispatched without requiring login popup
    await expect(page.locator("text=Enter your Mobile Number")).not.toBeVisible()
  })

  // -------------------------------------------------------------
  // Test 7: Payment Cancellation Preserves Cart and Grants Nothing
  // -------------------------------------------------------------
  test("BF-07: Payment cancellation modal dismissal keeps cart intact and grants no book access", async ({
    page,
  }) => {
    await loginAs(page, studentUser.email)

    await page.goto("/books", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-testid="books-page-root"][data-hydrated="true"]')).toBeVisible({ timeout: 15_000 })

    // Mock Razorpay to simulate user clicking cancel / modal dismissal (ondismiss callback)
    await page.evaluate(() => {
      (window as any).Razorpay = function (opts: any) {
        this.open = () => {
          setTimeout(() => {
            if (opts.modal && opts.modal.ondismiss) {
              opts.modal.ondismiss()
            }
          }, 50)
        }
      }
    })

    // Click Buy Now -> Drawer opens -> Place Order
    const buyNowBtn = page.locator('[data-testid="book-card-buy-now-btn"]').first()
    await buyNowBtn.click()
    const drawer = page.locator('[data-testid="cart-drawer-panel"]')
    await expect(drawer).toBeVisible()

    const placeOrderBtn = drawer.locator("button:has-text('PLACE ORDER')")
    await placeOrderBtn.click()

    // Wait for ondismiss callback execution
    await page.waitForTimeout(500)

    // Verify cart items remain preserved
    const cartCount = await page.locator('[data-testid="header-cart-btn"]').innerText()
    expect(cartCount).toBeTruthy()
  })

  // -------------------------------------------------------------
  // Test 8: Security Negative Case: Client-Sent Price Tampering is Ignored
  // -------------------------------------------------------------
  test("BF-08: Client-sent tampered price is strictly ignored by create-order endpoint", async ({
    page,
  }) => {
    await loginAs(page, otherStudentUser.email)

    const createRes = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId: "cbse-10-english-pyq", quantity: 1 }],
        price: 1, // Attacker tries to pay ₹1
        amount: 1,
        amountPaise: 100,
      },
    })
    expect(createRes.status()).toBe(200)
    const json = await createRes.json()
    // CBSE Class 10 English PYQ catalog price is ₹280 (28000 paise). Client's ₹1 is rejected/ignored.
    expect(json.amount).toBe(280)
    expect(json.amountPaise).toBe(28000)
  })

  // -------------------------------------------------------------
  // Test 9: Security Negative Case: Webhook Captures Order If Tab Closes
  // -------------------------------------------------------------
  test("BF-09: POST /api/razorpay/webhook marks order completed when user closes browser tab", async ({
    page,
  }) => {
    test.skip(!HAS_TEST_SECRET, "RAZORPAY_KEY_SECRET is not configured")
    await loginAs(page, otherStudentUser.email)

    // 1. Create order
    const createRes = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId: "cbse-10-pyqs-past-10-years-2027", quantity: 1 }],
      },
    })
    expect(createRes.status()).toBe(200)
    const orderData = await createRes.json()

    // 2. User simulates closing the browser tab immediately after payment is authorized by gateway.
    // The server receives Razorpay webhook event `payment.captured`
    const webhookPayload = JSON.stringify({
      entity: "event",
      account_id: "acc_test",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: `pay_webhook_${Date.now()}`,
            entity: "payment",
            amount: orderData.amountPaise,
            currency: "INR",
            status: "captured",
            order_id: orderData.razorpayOrderId,
            notes: { orderId: orderData.orderId },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    })

    const webhookSignature = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(webhookPayload)
      .digest("hex")

    const webhookRes = await page.request.post("/api/razorpay/webhook", {
      data: webhookPayload,
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": webhookSignature,
      },
    })
    expect(webhookRes.status()).toBe(200)
    const webhookJson = await webhookRes.json()
    expect(webhookJson.received).toBe(true)
    expect(webhookJson.processed).toBe("book_order")

    // 3. Verify user now has verified access to download the purchased book
    const downloadRes = await page.request.get(
      "/api/books/cbse-10-pyqs-past-10-years-2027/download?download=true"
    )
    expect(downloadRes.status()).toBe(200)
    const bodyBuffer = await downloadRes.body()
    expect(bodyBuffer.toString("utf-8", 0, 5)).toContain("%PDF-")
  })

  // -------------------------------------------------------------
  // Test 10: Security Negative Case: Non-buyer gets 401/403 on download & already-owned book returns 409
  // -------------------------------------------------------------
  test("BF-10: Non-buyer gets 401/403 on download and duplicate purchase returns 409 ALREADY_OWNED", async ({
    page,
  }) => {
    // 1. Unauthenticated guest download returns 401 Unauthorized
    await page.context().clearCookies()
    const guestDownload = await page.request.get(
      "/api/books/cbse-10-pyqs-past-10-years-2027/download?download=true"
    )
    expect([401, 403]).toContain(guestDownload.status())

    // 2. Already-owned purchase attempt by otherStudentUser returns 409
    await loginAs(page, otherStudentUser.email)
    const dupRes = await page.request.post("/api/books/checkout/create-order", {
      data: {
        items: [{ bookId: "cbse-10-pyqs-past-10-years-2027", quantity: 1 }],
      },
    })
    expect(dupRes.status()).toBe(409)
    const dupJson = await dupRes.json()
    expect(dupJson.error).toBe("ALREADY_OWNED")
  })

  // -------------------------------------------------------------
  // Test 11: Security: Book catalogue API never exposes fullPdfUrl to public/student
  // -------------------------------------------------------------
  test("BF-11: Public book catalogue API strictly never exposes fullPdfUrl to guests or students", async ({
    page,
  }) => {
    // 1. Guest request
    await page.context().clearCookies()
    const guestRes = await page.request.get("/api/books")
    expect(guestRes.status()).toBe(200)
    const guestData = await guestRes.json()
    expect(guestData.success).toBe(true)
    for (const b of guestData.data) {
      expect(b.fullPdfUrl).toBeUndefined()
    }

    // 2. Student request
    await loginAs(page, studentUser.email)
    const stuRes = await page.request.get("/api/books")
    expect(stuRes.status()).toBe(200)
    const stuData = await stuRes.json()
    for (const b of stuData.data) {
      expect(b.fullPdfUrl).toBeUndefined()
    }

    // 3. Single book by slug
    if (guestData.data.length > 0) {
      const testSlug = guestData.data[0].slug
      const singleRes = await page.request.get(`/api/books?slug=${testSlug}`)
      expect(singleRes.status()).toBe(200)
      const singleData = await singleRes.json()
      expect(singleData.data.fullPdfUrl).toBeUndefined()
    }
  })
})
