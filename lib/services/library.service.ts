import { getAllBooks, getBookById, hasUserPurchasedBook } from "@/lib/books/bookService";
import { Viewer } from "@/lib/api/v1/viewer";
import { LibraryItemDto } from "@aspirantbook/shared";

export async function getLibraryItems(viewer: Viewer): Promise<LibraryItemDto[]> {
  const books = await getAllBooks();
  const published = books.filter((b) => !b.status || b.status === "published").slice(0, 50);

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

  // Reader security: Check purchase ownership
  const isPaid =
    (typeof book.price === "number" && book.price > 0) ||
    (typeof book.originalPrice === "number" && book.originalPrice > 0);
  const isOwner = viewer.userId ? await hasUserPurchasedBook(viewer.userId, book.id) : false;
  const canAccessFull = !viewer.isGuest && (isOwner || !isPaid || viewer.role === "ADMIN");
  const downloadUrl = canAccessFull && book.fullPdfUrl ? book.fullPdfUrl : book.samplePdfUrl;

  return {
    id: book.id,
    title: book.title,
    slug: book.slug,
    author: book.author || "AspirantBook Editorial",
    coverImage: book.coverImage || null,
    fileSize: typeof book.fileSize === "number" ? book.fileSize : 5_000_000,
    fileUrl: downloadUrl || "",
    isFullAccess: canAccessFull,
    isFree: !isPaid,
  };
}
