import { adaptBooksCatalogSeo } from "@/lib/seo"
import BooksCatalogClient from "@/components/books/BooksCatalogClient"

// Catalogue shell is static; the client child hydrates search, sort and cart.
export const revalidate = 3600

export const metadata = adaptBooksCatalogSeo().metadata

export default function BooksPage() {
  return <BooksCatalogClient />
}
