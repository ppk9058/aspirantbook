import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const readerPagePath = path.resolve(__dirname, "../../app/(dashboard)/books/read/[id]/page.tsx");
const ordersPagePath = path.resolve(__dirname, "../../app/(dashboard)/books/orders/page.tsx");

describe("Book Reader Page & Orders Navigation", () => {
  const readerSource = fs.readFileSync(readerPagePath, "utf-8");
  const ordersSource = fs.readFileSync(ordersPagePath, "utf-8");

  it("new reader page contains inline=1 and download=true URL patterns using encodeURIComponent", () => {
    assert.ok(
      readerSource.includes("encodeURIComponent"),
      "Reader page must use encodeURIComponent for book id"
    );
    assert.ok(
      readerSource.includes("/download?inline=1"),
      "Reader page must use the /download?inline=1 endpoint for iframe src"
    );
    assert.ok(
      readerSource.includes("/download?download=true"),
      "Reader page must use the /download?download=true endpoint for download link"
    );
  });

  it("new reader page does NOT contain fullPdfUrl or bare GET to book detail route", () => {
    assert.ok(
      !readerSource.includes("fullPdfUrl"),
      "Reader page must NEVER reference fullPdfUrl"
    );
    // Ensure no call to /api/books/${id} or /api/books/${
    assert.ok(
      !/\/api\/books\/\$\{[^}]+\}(?!\/download)/.test(readerSource),
      "Reader page must not call the bare book-detail API route"
    );
  });

  it("orders page links to /books/read/ and no longer imports or renders SecurePdfViewer", () => {
    assert.ok(
      ordersSource.includes("/books/read/"),
      "Orders page must link to /books/read/"
    );
    assert.ok(
      !ordersSource.includes("SecurePdfViewer"),
      "Orders page must no longer import or render SecurePdfViewer"
    );
  });
});
