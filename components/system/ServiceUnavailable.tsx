import Link from "next/link"
import { AlertCircle, Home } from "lucide-react"

/**
 * Server-rendered 503-style state for pages that cannot load their data.
 * Never render fabricated content when the database is unreachable.
 */
export default function ServiceUnavailable({
  title = "Temporarily unavailable",
  description = "We could not load this page right now. Please try again in a moment.",
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
}: {
  title?: string
  description?: string
  homeHref?: string
  homeLabel?: string
}) {
  return (
    <main className="min-h-[70dvh] w-full flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>

        <Link
          href={homeHref}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-[0.98] sm:w-auto"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>{homeLabel}</span>
        </Link>
      </div>
    </main>
  )
}
