import { test, expect } from "@playwright/test"

/**
 * V2: guest checkout must be rejected by the server, not only by the UI.
 *
 * POST /api/books/checkout/create-order reads the user from the NextAuth
 * session; there is no userId in the request body. A request with no session
 * cookie must therefore return 401 and must not create an order.
 */
test.describe("Guest checkout", () => {
  test("GUEST-CHECKOUT: unauthenticated create-order is rejected with 401", async ({ playwright, baseURL }) => {
    const guest = await playwright.request.newContext({ baseURL })
    try {
      const res = await guest.post("/api/books/checkout/create-order", {
        data: { items: [{ bookId: "cbse-10-pyqs-past-10-years-2027", quantity: 1 }] },
      })

      expect(res.status()).toBe(401)
      const body = await res.json()
      expect(String(body.error || "")).toMatch(/log in/i)
      expect(body.orderId).toBeUndefined()
      expect(body.razorpayOrderId).toBeUndefined()
    } finally {
      await guest.dispose()
    }
  })
})
