import React from "react"
import { Metadata } from "next"
import { getBookBySlug, getBookById } from "@/lib/books/bookService"
import BookDetailsClient from "@/components/books/BookDetailsClient"
import { safeJsonLdStringify } from "@/lib/seo/core"

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

  const title = `${book.title} - ${book.author} | AspirantBook`
  const description =
    book.shortDescription ||
    book.description?.slice(0, 160) ||
    "Buy and read authentic digital PDF notes and eBooks instantly on AspirantBook."

  return {
    title,
    description,
    alternates: {
      canonical: `/books/${book.slug || slug}`,
    },
    openGraph: {
      title,
      description,
      type: "book",
      images: book.coverImage ? [book.coverImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: book.coverImage ? [book.coverImage] : [],
    },
  }
}

export default async function BookDetailsPage({ params }: BookPageProps) {
  const { slug } = await params
  const book = (await getBookBySlug(slug)) || (await getBookById(slug))

  const jsonLd = book
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": book.title,
        "description": book.shortDescription || book.description?.slice(0, 200),
        "image": book.coverImage ? [book.coverImage] : undefined,
        "offers": {
          "@type": "Offer",
          "price": book.price,
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
        },
        ...(book.rating && book.ratingCount
          ? {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": book.rating,
                "reviewCount": book.ratingCount,
              },
            }
          : {}),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
        />
      )}
      <BookDetailsClient initialBook={book} slug={slug} />
    </>
  )
}
