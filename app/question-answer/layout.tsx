import { PublicHeader } from "@/components/content-engine-public/PublicHeader"
import { PublicFooter } from "@/components/content-engine-public/PublicFooter"

export default function QuestionAnswerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader lang="en" />
      <main className="flex-1">{children}</main>
      <PublicFooter lang="en" />
    </div>
  )
}
