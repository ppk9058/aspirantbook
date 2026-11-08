import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { isAllowedReaderSrc } from "@/lib/pdf/reader-src"
import { buildPdfReaderHref } from "@/lib/pdf/reader-href"
import { isAllowedStorageFileUrl } from "@/lib/storage/storage-origins"

test("isAllowedReaderSrc allowlist checks", (t) => {
  // Save original env
  const origBase = process.env.S3_PUBLIC_BASE_URL
  const origBucket = process.env.S3_PUBLIC_BUCKET_NAME

  process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com"
  delete process.env.S3_PUBLIC_BUCKET_NAME

  t.after(() => {
    if (origBase !== undefined) process.env.S3_PUBLIC_BASE_URL = origBase
    else delete process.env.S3_PUBLIC_BASE_URL

    if (origBucket !== undefined) process.env.S3_PUBLIC_BUCKET_NAME = origBucket
    else delete process.env.S3_PUBLIC_BUCKET_NAME
  })

  // Same-origin allowed API routes
  assert.equal(isAllowedReaderSrc("/api/books/x/download?inline=1"), true)
  assert.equal(isAllowedReaderSrc("/api/pyqs/file/abc"), true)
  assert.equal(isAllowedReaderSrc("/api/current-affairs/file/123"), true)

  // Public storage URL matching configured base
  assert.equal(isAllowedReaderSrc("https://cdn.example.com/materials/test.pdf"), true)

  // Rejections
  assert.equal(isAllowedReaderSrc("//evil.com/a.pdf"), false, "Protocol relative must be rejected")
  assert.equal(isAllowedReaderSrc("/api/../etc/passwd"), false, "Directory traversal must be rejected")
  assert.equal(isAllowedReaderSrc("/api/%2e%2e/etc/passwd"), false, "Encoded traversal must be rejected")
  assert.equal(isAllowedReaderSrc("\\api\\x"), false, "Backslash must be rejected")
  assert.equal(isAllowedReaderSrc("http://anything.com/a.pdf"), false, "Plain http must be rejected")
  assert.equal(isAllowedReaderSrc("javascript:alert(1)"), false, "javascript: scheme must be rejected")
  assert.equal(isAllowedReaderSrc("#"), false, "Hash must be rejected")
  assert.equal(isAllowedReaderSrc(""), false, "Empty string must be rejected")
  assert.equal(isAllowedReaderSrc("   "), false, "Whitespace must be rejected")
  assert.equal(isAllowedReaderSrc("https://user:pass@cdn.example.com/test.pdf"), false, "Userinfo in URL must be rejected")
  assert.equal(isAllowedReaderSrc("https://attacker.com/fake.pdf"), false, "Unregistered domain must be rejected")
})

test("isAllowedStorageFileUrl and isAllowedReaderSrc direct storage URL validation", (t) => {
  const envSnapshot = {
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    S3_BUCKET: process.env.S3_BUCKET,
    AWS_REGION: process.env.AWS_REGION,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    AWS_ENDPOINT: process.env.AWS_ENDPOINT,
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    AWS_S3_FORCE_PATH_STYLE: process.env.AWS_S3_FORCE_PATH_STYLE,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    S3_PUBLIC_BUCKET_NAME: process.env.S3_PUBLIC_BUCKET_NAME,
  }

  function clearStorageEnv() {
    delete process.env.AWS_S3_BUCKET_NAME
    delete process.env.AWS_S3_BUCKET
    delete process.env.S3_BUCKET
    delete process.env.AWS_REGION
    delete process.env.S3_REGION
    delete process.env.S3_ENDPOINT
    delete process.env.AWS_ENDPOINT
    delete process.env.S3_FORCE_PATH_STYLE
    delete process.env.AWS_S3_FORCE_PATH_STYLE
    delete process.env.S3_PUBLIC_BASE_URL
    delete process.env.S3_PUBLIC_BUCKET_NAME
  }

  t.after(() => {
    clearStorageEnv()
    for (const [k, v] of Object.entries(envSnapshot)) {
      if (v !== undefined) process.env[k] = v
    }
  })

  // 1. Default AWS virtual-host URL accepted
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "aspirantbook-uploads"
  process.env.AWS_REGION = "ap-south-1"
  const awsUrl = "https://aspirantbook-uploads.s3.ap-south-1.amazonaws.com/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(awsUrl), true, "Default AWS virtual-host URL must be accepted by storage helper")
  assert.equal(isAllowedReaderSrc(awsUrl), true, "Default AWS virtual-host URL must be accepted by reader src validator")

  // Also works with S3_BUCKET and default region us-east-1
  clearStorageEnv()
  process.env.S3_BUCKET = "my-s3-bucket"
  const defaultRegionUrl = "https://my-s3-bucket.s3.us-east-1.amazonaws.com/slides/lesson1.pdf"
  assert.equal(isAllowedStorageFileUrl(defaultRegionUrl), true, "Default us-east-1 region must be accepted")
  assert.equal(isAllowedReaderSrc(defaultRegionUrl), true, "Default us-east-1 region must be accepted by reader src")

  // 2. Endpoint virtual-host accepted
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.S3_ENDPOINT = "https://r2.cloudflarestorage.com"
  const endpointVhUrl = "https://my-bucket.r2.cloudflarestorage.com/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(endpointVhUrl), true, "Endpoint virtual-host URL must be accepted")
  assert.equal(isAllowedReaderSrc(endpointVhUrl), true, "Endpoint virtual-host URL must be accepted by reader src")

  // 3. Path-style accepted only with the "/<bucket>/" prefix
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.S3_ENDPOINT = "https://storage.mycompany.com"
  process.env.S3_FORCE_PATH_STYLE = "true"

  const pathStyleValid = "https://storage.mycompany.com/my-bucket/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(pathStyleValid), true, "Path-style with matching bucket must be accepted")
  assert.equal(isAllowedReaderSrc(pathStyleValid), true, "Path-style with matching bucket must be accepted by reader src")

  const pathStyleWrongBucket = "https://storage.mycompany.com/other-bucket/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(pathStyleWrongBucket), false, "Path-style with wrong bucket must be rejected")
  assert.equal(isAllowedReaderSrc(pathStyleWrongBucket), false)

  const pathStylePrefixMismatch = "https://storage.mycompany.com/my-bucket-fake/test.pdf"
  assert.equal(isAllowedStorageFileUrl(pathStylePrefixMismatch), false, "Path-style prefix mismatch must be rejected")
  assert.equal(isAllowedReaderSrc(pathStylePrefixMismatch), false)

  const pathStyleNoKey = "https://storage.mycompany.com/my-bucket/"
  assert.equal(isAllowedStorageFileUrl(pathStyleNoKey), false, "Path-style without file key must be rejected")
  assert.equal(isAllowedReaderSrc(pathStyleNoKey), false)

  // 4. A different bucket rejected
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.AWS_REGION = "us-east-1"
  const diffBucketUrl = "https://other-bucket.s3.us-east-1.amazonaws.com/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(diffBucketUrl), false, "Different bucket must be rejected")
  assert.equal(isAllowedReaderSrc(diffBucketUrl), false)

  // 5. http rejected
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.AWS_REGION = "us-east-1"
  const httpUrl = "http://my-bucket.s3.us-east-1.amazonaws.com/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(httpUrl), false, "http scheme must be rejected")
  assert.equal(isAllowedReaderSrc(httpUrl), false)

  process.env.S3_ENDPOINT = "http://minio:9000"
  process.env.S3_FORCE_PATH_STYLE = "true"
  const httpEndpointUrl = "http://minio:9000/my-bucket/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(httpEndpointUrl), false, "http endpoint must never match")
  assert.equal(isAllowedReaderSrc(httpEndpointUrl), false)

  // 6. Userinfo rejected
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.AWS_REGION = "us-east-1"
  const userinfoUrl = "https://user:pass@my-bucket.s3.us-east-1.amazonaws.com/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(userinfoUrl), false, "Userinfo in URL must be rejected")
  assert.equal(isAllowedReaderSrc(userinfoUrl), false)

  // 7. Lookalikes rejected
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.AWS_REGION = "us-east-1"
  const lookalike1 = "https://my-bucket.s3.us-east-1.amazonaws.com.evil.com/a.pdf"
  const lookalike2 = "https://evil.com/my-bucket.s3.us-east-1.amazonaws.com/a.pdf"
  assert.equal(isAllowedStorageFileUrl(lookalike1), false, "Domain suffix lookalike must be rejected")
  assert.equal(isAllowedReaderSrc(lookalike1), false)
  assert.equal(isAllowedStorageFileUrl(lookalike2), false, "Domain path lookalike must be rejected")
  assert.equal(isAllowedReaderSrc(lookalike2), false)

  // 8. Path containing ".." or "//" rejected
  clearStorageEnv()
  process.env.AWS_S3_BUCKET_NAME = "my-bucket"
  process.env.AWS_REGION = "us-east-1"
  const pathTraversal = "https://my-bucket.s3.us-east-1.amazonaws.com/documents/../etc/test.pdf"
  const pathTraversalEncoded = "https://my-bucket.s3.us-east-1.amazonaws.com/documents/%2e%2e/test.pdf"
  const pathDoubleSlash = "https://my-bucket.s3.us-east-1.amazonaws.com/documents//test.pdf"
  const pathDoubleSlashEncoded = "https://my-bucket.s3.us-east-1.amazonaws.com/documents/%2f%2f/test.pdf"
  assert.equal(isAllowedStorageFileUrl(pathTraversal), false, "Raw dot-dot in path must be rejected")
  assert.equal(isAllowedReaderSrc(pathTraversal), false)
  assert.equal(isAllowedStorageFileUrl(pathTraversalEncoded), false, "Encoded dot-dot in path must be rejected")
  assert.equal(isAllowedReaderSrc(pathTraversalEncoded), false)
  assert.equal(isAllowedStorageFileUrl(pathDoubleSlash), false, "Double slash in path must be rejected")
  assert.equal(isAllowedReaderSrc(pathDoubleSlash), false)
  assert.equal(isAllowedStorageFileUrl(pathDoubleSlashEncoded), false, "Encoded double slash in path must be rejected")
  assert.equal(isAllowedReaderSrc(pathDoubleSlashEncoded), false)

  // 9. No bucket env means rejected
  clearStorageEnv()
  const fallbackAttempt = "https://aspirantbook-uploads.s3.us-east-1.amazonaws.com/documents/test.pdf"
  assert.equal(isAllowedStorageFileUrl(fallbackAttempt), false, "Must return false when no bucket env is set")
  assert.equal(isAllowedReaderSrc(fallbackAttempt), false)
})

test("buildPdfReaderHref builds proper encoded reader query strings", () => {
  const href1 = buildPdfReaderHref({
    src: "/api/books/123/download?inline=1",
    downloadUrl: "/api/books/123/download?download=true",
    title: "Economics & Polity",
    subtitle: "UPSC 2024",
    badge: "Official eBook",
  })

  assert.ok(href1.startsWith("/pdf/view?"))
  const parsed = new URL(href1, "https://local.test")
  assert.equal(parsed.searchParams.get("src"), "/api/books/123/download?inline=1")
  assert.equal(parsed.searchParams.get("dl"), "/api/books/123/download?download=true")
  assert.equal(parsed.searchParams.get("title"), "Economics & Polity")
  assert.equal(parsed.searchParams.get("subtitle"), "UPSC 2024")
  assert.equal(parsed.searchParams.get("badge"), "Official eBook")

  // Minimal options
  const href2 = buildPdfReaderHref({
    src: "/api/pyqs/file/paper_1",
  })
  assert.equal(href2, "/pdf/view?src=%2Fapi%2Fpyqs%2Ffile%2Fpaper_1")
})

test("Guard test: ensures NO file under app/ or components/ imports usePdfModal or SecurePdfViewer", () => {
  const ROOT = path.resolve(__dirname, "../..")
  const scanDirs = ["app", "components"]

  function scanDir(dir: string): string[] {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) return []
    const results: string[] = []
    const entries = fs.readdirSync(fullDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(fullDir, entry.name)
      if (entry.isDirectory()) {
        results.push(...scanDir(path.join(dir, entry.name)))
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        results.push(fullPath)
      }
    }
    return results
  }

  const allFiles = scanDirs.flatMap(scanDir)
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf8")
    assert.ok(
      !content.includes("usePdfModal"),
      `File ${path.relative(ROOT, filePath)} must NOT import or use usePdfModal`
    )
    assert.ok(
      !content.includes("SecurePdfViewer"),
      `File ${path.relative(ROOT, filePath)} must NOT import or use SecurePdfViewer`
    )
  }
})
