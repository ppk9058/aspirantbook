"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Layers,
  PlusCircle,
  CheckSquare,
  Languages,
  ShieldCheck,
  Tag,
  Bookmark,
  PlayCircle,
  Download,
} from "lucide-react"

const TABS = [
  { name: "Library", href: "/admin/content-engine", icon: Layers, exact: true },
  { name: "Add Batch", href: "/admin/content-engine/add", icon: PlusCircle },
  { name: "Assign", href: "/admin/content-engine/assign", icon: CheckSquare },
  { name: "Hindi Review", href: "/admin/content-engine/hindi", icon: Languages },
  { name: "Quality Gates", href: "/admin/content-engine/gates", icon: ShieldCheck },
  { name: "Categories", href: "/admin/content-engine/categories", icon: Tag },
  { name: "Exam Aliases", href: "/admin/content-engine/aliases", icon: Bookmark },
  { name: "Practice", href: "/admin/content-engine/practice", icon: PlayCircle },
  { name: "Export", href: "/admin/content-engine/export", icon: Download },
]

export function ContentEngineHeader({
  title = "Content Engine",
  description = "High-throughput exam question processing, multilingual review, and zero-cost SEO publishing.",
}: {
  title?: string
  description?: string
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
      </div>

      <div className="border-b border-border overflow-x-auto no-scrollbar">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max pb-px" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px]",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
