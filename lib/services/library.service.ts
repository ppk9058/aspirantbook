import { getAllBooks, getBookById } from "@/lib/books/bookService";
import { Viewer } from "@/lib/api/v1/viewer";
import { LibraryItemDto } from "@aspirantbook/shared";

export async function getLibraryItems(viewer: Viewer): Promise<LibraryItemDto[]> {
  const books = await getAllBooks();
  const published = books.filter((b) => !b.status || b.status === "published");

  return published.map((b) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    coverImage: b.coverImage || null,
    author: b.author || "AspirantBook Editorial",
    fileSize: typeof b.fileSize === "number" ? b.fileSize : 5_000_000,
    fileUrl: b.samplePdfUrl || b.fullPdfUrl || "",
    acquiredAt: b.createdAt || new Date().toISOString(),
  }));
}

export async function getLibraryBookDetail(viewer: Viewer, id: string) {
  const book = await getBookById(id);
  if (!book) {
    throw new Error("NOT_FOUND: Book not found in library");
  }

  // Reader security: Only authorized/authenticated viewers can access the full PDF
  const canAccessFull = !viewer.isGuest;
  const downloadUrl = canAccessFull && book.fullPdfUrl ? book.fullPdfUrl : book.samplePdfUrl;

  return {
    id: book.id,
    title: book.title,
    slug: book.slug,
    author: book.author || "AspirantBook Editorial",
    coverImage: book.coverImage || null,
    fileSize: typeof book.fileSize === "number" ? book.fileSize : 5_000_000,
    fileUrl: downloadUrl || "",
    isFullAccess: canAccessFull && Boolean(book.fullPdfUrl),
  };
}
