"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Globe } from "lucide-react"

export function PublicHeader({ lang = "en" }: { lang?: "en" | "hi" }) {
  const pathname = usePathname()
  const isHi = lang === "hi" || pathname.startsWith("/hi")

  // Generate twin language switch target URL
  const targetUrl = isHi
    ? pathname.replace(/^\/hi/, "") || "/question-answer"
    : `/hi${pathname}`

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
        <Link
          href={isHi ? "/hi/question-answer" : "/question-answer"}
          className="inline-flex items-center gap-2.5 font-bold text-lg text-foreground tracking-tight min-h-[44px]"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <span>
            {isHi ? "अभ्यास प्रश्नोत्तर" : "Question Repository"}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={targetUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors min-h-[44px]"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>{isHi ? "English" : "हिन्दी"}</span>
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-block"
          >
            TrillionSkill Home
          </Link>
        </div>
      </div>
    </header>
  )
}
