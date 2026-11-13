import Link from "next/link"

export function PublicFooter({ lang = "en" }: { lang?: "en" | "hi" }) {
  const isHi = lang === "hi"

  return (
    <footer className="border-t border-border bg-muted/20 py-10 mt-16 text-xs text-muted-foreground">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-semibold text-foreground text-sm">
              AspirantBook Question &amp; Answer Bank
            </span>
            <p className="max-w-md">
              {isHi
                ? "यूपीएससी, राज्य लोक सेवा आयोग (बीपीएससी, यूपीपीसीएस, आरएएस) और एसएससी परीक्षाओं के प्रामाणिक पिछले वर्षों के प्रश्नोत्तर।"
                : "Authentic previous year competitive exam questions, detailed bilingual explanations, and verified solutions for UPSC, State PSCs, and SSC."}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <Link href="/question-answer" className="hover:text-foreground transition-colors">
              English Questions
            </Link>
            <Link href="/hi/question-answer" className="hover:text-foreground transition-colors">
              हिन्दी प्रश्नोत्तर
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/refund" className="hover:text-foreground transition-colors">
              Refund Policy
            </Link>
            <Link href="/shipping" className="hover:text-foreground transition-colors">
              Shipping &amp; Delivery
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 text-center">
          <p>&copy; {new Date().getFullYear()} AspirantBook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
