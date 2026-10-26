import { describe, it, afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"

import { generatePresignedUrl, deleteFromS3, getS3Url } from "@/lib/aws-s3"
import {
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay"

/**
 * B-012 / B-013 regression: required environment variables must be checked
 * explicitly instead of being force-unwrapped with `!`.
 *
 * Before the fix:
 *  - getS3Url() silently produced a URL containing "undefined" as the bucket.
 *  - generatePresignedUrl() reached the SDK with undefined credentials.
 *  - verifyRazorpaySignature() threw a TypeError from crypto.createHmac.
 *
 * After the fix every helper fails closed with a diagnosable result.
 */

const ENV_KEYS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET_NAME",
  "AWS_REGION",
  "AWS_CLOUDFRONT_DOMAIN",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
] as const

type EnvKey = (typeof ENV_KEYS)[number]

const saved = new Map<EnvKey, string | undefined>()

beforeEach(() => {
  for (const key of ENV_KEYS) saved.set(key, process.env[key])
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function clearStorageEnv() {
  delete process.env.AWS_ACCESS_KEY_ID
  delete process.env.AWS_SECRET_ACCESS_KEY
  delete process.env.AWS_S3_BUCKET_NAME
  delete process.env.AWS_CLOUDFRONT_DOMAIN
}

describe("S3 configuration guards (B-013)", () => {
  it("getS3Url throws an explicit error instead of building an 'undefined' URL", () => {
    clearStorageEnv()

    assert.throws(
      () => getS3Url("covers/lesson.png"),
      /S3 is not configured: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET_NAME are required/,
    )
  })

  it("generatePresignedUrl rejects with the explicit configuration error", async () => {
    clearStorageEnv()

    await assert.rejects(
      generatePresignedUrl({ key: "covers/lesson.png", contentType: "image/png" }),
      /S3 is not configured/,
    )
  })

  it("deleteFromS3 rejects with the explicit configuration error", async () => {
    clearStorageEnv()

    await assert.rejects(deleteFromS3("covers/lesson.png"), /S3 is not configured/)
  })

  it("still builds a normal S3 URL when the bucket is configured", () => {
    process.env.AWS_ACCESS_KEY_ID = "test-key"
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret"
    process.env.AWS_S3_BUCKET_NAME = "trillionskill-test"
    process.env.AWS_REGION = "ap-south-1"
    delete process.env.AWS_CLOUDFRONT_DOMAIN

    assert.equal(
      getS3Url("covers/lesson.png"),
      "https://trillionskill-test.s3.ap-south-1.amazonaws.com/covers/lesson.png",
    )
  })
})

describe("Razorpay signature guards (B-012)", () => {
  it("verifyRazorpaySignature returns false (never throws) when the secret is missing", () => {
    delete process.env.RAZORPAY_KEY_SECRET

    assert.equal(
      verifyRazorpaySignature({ orderId: "order_1", paymentId: "pay_1", signature: "deadbeef" }),
      false,
    )
  })

  it("verifyRazorpaySignature accepts a correctly signed payload", () => {
    process.env.RAZORPAY_KEY_SECRET = "unit-test-secret"
    const signature = crypto
      .createHmac("sha256", "unit-test-secret")
      .update("order_1|pay_1")
      .digest("hex")

    assert.equal(
      verifyRazorpaySignature({ orderId: "order_1", paymentId: "pay_1", signature }),
      true,
    )
    assert.equal(
      verifyRazorpaySignature({ orderId: "order_1", paymentId: "pay_1", signature: "x" }),
      false,
    )
  })

  it("verifyRazorpayWebhookSignature never falls back to RAZORPAY_KEY_SECRET", () => {
    process.env.RAZORPAY_KEY_SECRET = "unit-test-secret"
    delete process.env.RAZORPAY_WEBHOOK_SECRET

    const body = JSON.stringify({ event: "payment.captured" })
    const keySecretSignature = crypto
      .createHmac("sha256", "unit-test-secret")
      .update(body)
      .digest("hex")

    assert.equal(verifyRazorpayWebhookSignature(body, keySecretSignature), false)
  })

  it("verifyRazorpayWebhookSignature accepts a correctly signed webhook", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "unit-webhook-secret"
    const body = JSON.stringify({ event: "payment.captured" })
    const signature = crypto
      .createHmac("sha256", "unit-webhook-secret")
      .update(body)
      .digest("hex")

    assert.equal(verifyRazorpayWebhookSignature(body, signature), true)
  })
})
