import React from "react"
import { Metadata } from "next"
import { getBookBySlug, getBookById } from "@/lib/books/bookService"
import BookDetailsClient from "@/components/books/BookDetailsClient"

interface BookPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params
  const book = (await getBookBySlug(slug)) || (await getBookById(slug))

  if (!book) {
    return {
      title: "eBook Not Found | TrillionSkill",
      description: "The requested eBook could not be found in our catalogue.",
    }
  }

  const title = `${book.title} - ${book.author} | TrillionSkill eBook Store`
  const description =
    book.shortDescription ||
    book.description?.slice(0, 160) ||
    "Buy and read authentic digital PDF notes and eBooks instantly on TrillionSkill."

  return {
    title,
    description,
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

  return <BookDetailsClient initialBook={book} slug={slug} />
}
