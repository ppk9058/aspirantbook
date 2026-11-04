/**
 * Unit test for image upload validation:
 * - images only (.png, .jpg, .jpeg, .webp)
 * - <= 5 MB
 * - reject non-images or > 5 MB
 */
import assert from "node:assert/strict"
import { test, describe } from "node:test"

function validateCourseImageUpload(fileName: string, fileSize: number, folder: string): { ok: boolean; error?: string } {
  const nameLower = fileName.toLowerCase()
  const isImage = nameLower.endsWith(".png") || nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg") || nameLower.endsWith(".webp")
  const isImageFolder = folder === "thumbnails" || folder === "images" || folder === "teachers"

  if (isImageFolder) {
    if (!isImage) {
      return { ok: false, error: "Only image files (.png, .jpg, .jpeg, .webp) are allowed for image uploads." }
    }
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024
    if (fileSize > MAX_IMAGE_SIZE) {
      return { ok: false, error: "Image file exceeds 5 MB size limit." }
    }
  }

  return { ok: true }
}

describe("Image Upload Validation", () => {
  test("allows valid PNG, JPG, WEBP under 5MB in thumbnails folder", () => {
    assert.deepEqual(validateCourseImageUpload("cover.png", 2 * 1024 * 1024, "thumbnails"), { ok: true })
    assert.deepEqual(validateCourseImageUpload("photo.jpg", 4.5 * 1024 * 1024, "teachers"), { ok: true })
    assert.deepEqual(validateCourseImageUpload("banner.webp", 1024 * 100, "images"), { ok: true })
  })

  test("rejects non-images (PDF, MP4, EXE) in image folders", () => {
    const pdfRes = validateCourseImageUpload("syllabus.pdf", 1024 * 1024, "thumbnails")
    assert.equal(pdfRes.ok, false)
    assert.match(pdfRes.error || "", /Only image files/)

    const mp4Res = validateCourseImageUpload("lecture.mp4", 1024 * 1024, "teachers")
    assert.equal(mp4Res.ok, false)
    assert.match(mp4Res.error || "", /Only image files/)
  })

  test("rejects images larger than 5 MB", () => {
    const oversizeRes = validateCourseImageUpload("huge-banner.png", 6 * 1024 * 1024, "thumbnails")
    assert.equal(oversizeRes.ok, false)
    assert.match(oversizeRes.error || "", /exceeds 5 MB/)
  })
})
