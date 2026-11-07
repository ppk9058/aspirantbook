import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  getPublicBucketName,
  getPublicBaseUrl,
  isPublicStorageConfigured,
  buildPublicUrl,
  isAllowedPublicFileUrl,
} from "@/lib/storage/public-url"
import { planBookFileFallback } from "@/lib/books/book-file-storage"
import {
  validateCoverImageRef,
  validateImageEntryRef,
  validateSamplePdfRef,
} from "@/lib/books/book-validation"

describe("storage public-url pure helpers", () => {
  const origBucket = process.env.S3_PUBLIC_BUCKET_NAME
  const origBase = process.env.S3_PUBLIC_BASE_URL

  beforeEach(() => {
    delete process.env.S3_PUBLIC_BUCKET_NAME
    delete process.env.S3_PUBLIC_BASE_URL
  })

  afterEach(() => {
    if (origBucket !== undefined) process.env.S3_PUBLIC_BUCKET_NAME = origBucket
    else delete process.env.S3_PUBLIC_BUCKET_NAME

    if (origBase !== undefined) process.env.S3_PUBLIC_BASE_URL = origBase
    else delete process.env.S3_PUBLIC_BASE_URL
  })

  it("handles unset environment variables safely", () => {
    assert.equal(getPublicBucketName(), null)
    assert.equal(getPublicBaseUrl(), null)
    assert.equal(isPublicStorageConfigured(), false)
    assert.throws(
      () => buildPublicUrl("books/cover.jpg"),
      /Public file storage is not configured/
    )
    assert.equal(isAllowedPublicFileUrl("https://files.aspirantbook.com/x.jpg"), false)
  })

  it("rejects non-https base URL and trims whitespace", () => {
    process.env.S3_PUBLIC_BASE_URL = "  http://files.aspirantbook.com  "
    assert.equal(getPublicBaseUrl(), null)
    assert.equal(isPublicStorageConfigured(), false)

    process.env.S3_PUBLIC_BASE_URL = "not-a-url"
    assert.equal(getPublicBaseUrl(), null)
  })

  it("removes trailing slashes from base URL", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com///"
    process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"
    assert.equal(getPublicBaseUrl(), "https://files.aspirantbook.com")
    assert.equal(isPublicStorageConfigured(), true)
  })

  it("strips leading slashes in key so URL never begins with double slash", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com"
    process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"

    assert.equal(
      buildPublicUrl("/books/cover.jpg"),
      "https://files.aspirantbook.com/books/cover.jpg"
    )
    assert.equal(
      buildPublicUrl("///books/sample.pdf"),
      "https://files.aspirantbook.com/books/sample.pdf"
    )
  })

  it("safely encodes spaces and special characters in key segments", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com"
    process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"

    const url = buildPublicUrl("books/my cover image #1 [final] & preview.png")
    assert.equal(
      url,
      "https://files.aspirantbook.com/books/my%20cover%20image%20%231%20%5Bfinal%5D%20%26%20preview.png"
    )
  })

  it("throws when key is empty or whitespace/slashes only", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com"
    process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"

    assert.throws(
      () => buildPublicUrl(""),
      /A storage key is required to build a public URL/
    )
    assert.throws(
      () => buildPublicUrl("///"),
      /A storage key is required to build a public URL/
    )
  })

  it("builds correct public URL on happy path", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com"
    process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"

    assert.equal(
      buildPublicUrl("books-sample/sample-uuid.pdf"),
      "https://files.aspirantbook.com/books-sample/sample-uuid.pdf"
    )
  })

  describe("isAllowedPublicFileUrl security checks", () => {
    beforeEach(() => {
      process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com"
      process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"
    })

    it("accepts same-origin https URLs", () => {
      assert.equal(
        isAllowedPublicFileUrl("https://files.aspirantbook.com/books/cover.jpg"),
        true
      )
    })

    it("rejects http URLs", () => {
      assert.equal(
        isAllowedPublicFileUrl("http://files.aspirantbook.com/books/cover.jpg"),
        false
      )
    })

    it("rejects userinfo injection tricks like https://files.aspirantbook.com@evil.com/x", () => {
      assert.equal(
        isAllowedPublicFileUrl("https://files.aspirantbook.com@evil.com/x"),
        false
      )
    })

    it("rejects foreign hosts and legacy R2 hosts", () => {
      assert.equal(isAllowedPublicFileUrl("https://evil.com/cover.jpg"), false)
      assert.equal(
        isAllowedPublicFileUrl(
          "https://aspirantbook-files.r2.cloudflarestorage.com/books/cover.jpg"
        ),
        false
      )
      assert.equal(
        isAllowedPublicFileUrl(
          "https://aspirantbook-files.s3.ap-south-1.amazonaws.com/books/cover.jpg"
        ),
        false
      )
    })

    it("rejects when base URL is unset", () => {
      delete process.env.S3_PUBLIC_BASE_URL
      assert.equal(
        isAllowedPublicFileUrl("https://files.aspirantbook.com/books/cover.jpg"),
        false
      )
    })
  })
})

describe("planBookFileFallback pure decision logic", () => {
  it("returns 'missing' when storageKey is null", () => {
    assert.equal(
      planBookFileFallback({ storageKey: null, privateStorageConfigured: true }),
      "missing"
    )
  })

  it("returns 'missing' when privateStorage is not configured", () => {
    assert.equal(
      planBookFileFallback({
        storageKey: "books-secure/uuid.pdf",
        privateStorageConfigured: false,
      }),
      "missing"
    )
  })

  it("returns 'private-s3' when key and private storage are present", () => {
    assert.equal(
      planBookFileFallback({
        storageKey: "books-secure/uuid.pdf",
        privateStorageConfigured: true,
      }),
      "private-s3"
    )
  })
})

describe("book asset validation rules (Task 2)", () => {
  const origBucket = process.env.S3_PUBLIC_BUCKET_NAME
  const origBase = process.env.S3_PUBLIC_BASE_URL

  beforeEach(() => {
    process.env.S3_PUBLIC_BASE_URL = "https://files.aspirantbook.com"
    process.env.S3_PUBLIC_BUCKET_NAME = "aspirantbook-public"
  })

  afterEach(() => {
    if (origBucket !== undefined) process.env.S3_PUBLIC_BUCKET_NAME = origBucket
    else delete process.env.S3_PUBLIC_BUCKET_NAME

    if (origBase !== undefined) process.env.S3_PUBLIC_BASE_URL = origBase
    else delete process.env.S3_PUBLIC_BASE_URL
  })

  it("passes unchanged old URLs so existing books remain re-savable", () => {
    const oldUrl =
      "https://aspirantbook-files.r2.cloudflarestorage.com/books/old-cover.png"
    const res = validateCoverImageRef(oldUrl, oldUrl)
    assert.equal(res.valid, true)
    assert.equal(res.value, oldUrl)

    const sampleRes = validateSamplePdfRef(
      "https://aspirantbook-files.r2.cloudflarestorage.com/old-sample.pdf",
      "https://aspirantbook-files.r2.cloudflarestorage.com/old-sample.pdf"
    )
    assert.equal(sampleRes.valid, true)
  })

  it("passes new relative keys and canonicalizes them", () => {
    const res = validateCoverImageRef("/uploads/books/new-cover.jpg", null)
    assert.equal(res.valid, true)
    assert.equal(res.value, "uploads/books/new-cover.jpg")

    const sampleRes = validateSamplePdfRef("books-sample/sample-123.pdf", null)
    assert.equal(sampleRes.valid, true)
    assert.equal(sampleRes.value, "books-sample/sample-123.pdf")
  })

  it("passes new public-base URLs and preserves them as-is", () => {
    const publicUrl = "https://files.aspirantbook.com/books/cover-uuid.png"
    const res = validateCoverImageRef(publicUrl, null)
    assert.equal(res.valid, true)
    assert.equal(res.value, publicUrl)

    const publicSample = "https://files.aspirantbook.com/books-sample/sample-uuid.pdf"
    const sampleRes = validateSamplePdfRef(publicSample, null)
    assert.equal(sampleRes.valid, true)
    assert.equal(sampleRes.value, publicSample)
  })

  it("rejects new foreign https URLs", () => {
    const foreignUrl = "https://evil.com/cover.png"
    const res = validateCoverImageRef(foreignUrl, "https://files.aspirantbook.com/old.png")
    assert.equal(res.valid, false)
    assert.equal(res.error, "Invalid coverImage")

    const sampleRes = validateSamplePdfRef("https://evil.com/sample.pdf", null)
    assert.equal(sampleRes.valid, false)
    assert.equal(sampleRes.error, "Invalid samplePdfUrl")
  })

  it("rejects newly introduced old-R2-style URLs", () => {
    const oldR2 =
      "https://aspirantbook-files.r2.cloudflarestorage.com/books/new-tampered.png"
    const res = validateCoverImageRef(oldR2, "https://files.aspirantbook.com/existing.png")
    assert.equal(res.valid, false)
    assert.equal(res.error, "Invalid coverImage")
  })

  it("validates images[] entries against existing images and coverImage", () => {
    const existingImgs = [
      "https://aspirantbook-files.r2.cloudflarestorage.com/old-1.png",
      "/uploads/books/old-2.png",
    ]
    const existingCover = "https://aspirantbook-files.r2.cloudflarestorage.com/cover.png"

    // Unchanged entry in existing.images passes
    assert.equal(
      validateImageEntryRef(existingImgs[0], existingImgs, existingCover).valid,
      true
    )

    // Entry matching existing cover passes
    assert.equal(
      validateImageEntryRef(existingCover, existingImgs, existingCover).valid,
      true
    )

    // New valid public URL passes
    assert.equal(
      validateImageEntryRef(
        "https://files.aspirantbook.com/books/img-3.png",
        existingImgs,
        existingCover
      ).valid,
      true
    )

    // New foreign URL fails
    assert.equal(
      validateImageEntryRef("https://attacker.com/bad.png", existingImgs, existingCover).valid,
      false
    )
  })
})
