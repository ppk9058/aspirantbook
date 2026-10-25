/**
 * Dependency-free Store-Only ZIP Archive Writer
 * Source: Exam_Content_Engine-4.html
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buf: Uint8Array): number {
  let c = -1
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8)
  }
  return (c ^ -1) >>> 0
}

export interface ZipFileInput {
  path: string
  content: string | Uint8Array
}

/**
 * Creates a valid store-only ZIP file buffer from a map or array of file paths and contents.
 */
export function createZipBuffer(files: Record<string, string | Uint8Array> | ZipFileInput[]): Uint8Array {
  const fileList: ZipFileInput[] = Array.isArray(files)
    ? files
    : Object.entries(files).map(([path, content]) => ({ path, content }))

  const encoder = new TextEncoder()
  const localHeadersAndData: Uint8Array[] = []
  const centralDirHeaders: Uint8Array[] = []
  let offset = 0
  let fileCount = 0

  for (const file of fileList) {
    const nameBytes = encoder.encode(file.path.replace(/^\/+/, ""))
    const dataBytes =
      typeof file.content === "string" ? encoder.encode(file.content) : file.content
    const crc = crc32(dataBytes)

    // Local file header (30 bytes)
    const localHeader = new DataView(new ArrayBuffer(30))
    localHeader.setUint32(0, 0x04034b50, true) // Signature
    localHeader.setUint16(4, 20, true) // Version needed (2.0)
    localHeader.setUint16(6, 0x800, true) // General purpose bit flag (UTF-8)
    localHeader.setUint16(8, 0, true) // Compression method (0 = store)
    localHeader.setUint16(10, 0, true) // Last mod time
    localHeader.setUint16(12, 0, true) // Last mod date
    localHeader.setUint32(14, crc, true) // CRC-32
    localHeader.setUint32(18, dataBytes.length, true) // Compressed size
    localHeader.setUint32(22, dataBytes.length, true) // Uncompressed size
    localHeader.setUint16(26, nameBytes.length, true) // File name length
    localHeader.setUint16(28, 0, true) // Extra field length

    // Central directory header (46 bytes)
    const centralHeader = new DataView(new ArrayBuffer(46))
    centralHeader.setUint32(0, 0x02014b50, true) // Central directory signature
    centralHeader.setUint16(4, 20, true) // Version made by
    centralHeader.setUint16(6, 20, true) // Version needed
    centralHeader.setUint16(8, 0x800, true) // UTF-8 flag
    centralHeader.setUint16(10, 0, true) // Compression (store)
    centralHeader.setUint16(12, 0, true) // Mod time
    centralHeader.setUint16(14, 0, true) // Mod date
    centralHeader.setUint32(16, crc, true) // CRC-32
    centralHeader.setUint32(20, dataBytes.length, true) // Compressed size
    centralHeader.setUint32(24, dataBytes.length, true) // Uncompressed size
    centralHeader.setUint16(28, nameBytes.length, true) // File name length
    centralHeader.setUint16(30, 0, true) // Extra field length
    centralHeader.setUint16(32, 0, true) // Comment length
    centralHeader.setUint16(34, 0, true) // Disk start
    centralHeader.setUint16(36, 0, true) // Internal attrs
    centralHeader.setUint32(38, 0, true) // External attrs
    centralHeader.setUint32(42, offset, true) // Offset of local header

    localHeadersAndData.push(new Uint8Array(localHeader.buffer), nameBytes, dataBytes)
    centralDirHeaders.push(new Uint8Array(centralHeader.buffer), nameBytes)

    offset += 30 + nameBytes.length + dataBytes.length
    fileCount++
  }

  const centralDirSize = centralDirHeaders.reduce((sum, chunk) => sum + chunk.length, 0)

  // End of Central Directory record (22 bytes)
  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, 0x06054b50, true) // EOCD signature
  eocd.setUint16(4, 0, true) // Disk number
  eocd.setUint16(6, 0, true) // Start disk
  eocd.setUint16(8, fileCount, true) // Total entries this disk
  eocd.setUint16(10, fileCount, true) // Total entries overall
  eocd.setUint32(12, centralDirSize, true) // Size of central dir
  eocd.setUint32(16, offset, true) // Offset of central dir
  eocd.setUint16(20, 0, true) // Comment length

  const totalLength = offset + centralDirSize + 22
  const result = new Uint8Array(totalLength)
  let pos = 0

  for (const chunk of localHeadersAndData) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  for (const chunk of centralDirHeaders) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  result.set(new Uint8Array(eocd.buffer), pos)

  return result
}
