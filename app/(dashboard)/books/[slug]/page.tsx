import React from "react"
import { Metadata } from "next"
import { getBookBySlug, getBookById, getBookRatingSignals } from "@/lib/books/bookService"
import BookDetailsClient from "@/components/books/BookDetailsClient"
import { adaptBookDetailSeo, buildBookDetailJsonLd, SeoJsonLd } from "@/lib/seo"

interface BookPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params
  const book = (await getBookBySlug(slug)) || (await getBookById(slug))

  if (!book) {
    return {
      title: "eBook Not Found | AspirantBook",
      description: "The requested eBook could not be found in our catalogue.",
    }
  }

  return adaptBookDetailSeo(book).metadata
}

export default async function BookDetailsPage({ params }: BookPageProps) {
  const { slug } = await params
  const book = (await getBookBySlug(slug)) || (await getBookById(slug))

  // Read the stored row, not the mapped book: bookService fills 4.8 / 1 when
  // the database has no rating, which must never reach schema.org.
  const ratingSignals = book ? await getBookRatingSignals(book.slug || slug) : null

  const jsonLd = book ? buildBookDetailJsonLd(book, ratingSignals) : []

  return (
    <>
      <SeoJsonLd schemas={jsonLd} />
      <BookDetailsClient initialBook={book} slug={slug} />
    </>
  )
}
