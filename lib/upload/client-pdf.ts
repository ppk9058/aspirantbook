export interface UploadPdfOptions {
  folder?: string
  endpoint?: string
  onProgress?: (percent: number) => void
}

export interface UploadPdfResponse {
  success: boolean
  url: string
  filePath?: string
  fileName: string
  fileSizeKb: number
  fileSizeMb?: number
  detectedPages?: number
  error?: string
}

/**
 * Shared client-side helper to upload a PDF file to the book studio / admin endpoints
 */
export async function uploadPdf(
  file: File,
  options: UploadPdfOptions = {}
): Promise<UploadPdfResponse> {
  const endpoint = options.endpoint || "/api/books/upload"
  const folder = options.folder || "books"

  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Only PDF files are permitted.")
  }

  const MAX_SIZE = 50 * 1024 * 1024 // 50MB
  if (file.size > MAX_SIZE) {
    throw new Error("PDF file size exceeds maximum limit of 50 MB.")
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", folder)
  formData.append("type", "pdf")

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "Failed to upload PDF")
  }

  return data
}
