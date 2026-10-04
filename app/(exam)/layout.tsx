import { Suspense } from "react"
import ExamFlowLoading from "./test-series/[id]/loading"

// Bare layout for exam mode — no sidebar, no topnav, no bottomnav
// The exam takes over the entire viewport
export default function ExamLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<ExamFlowLoading />}>
            {children}
        </Suspense>
    )
}

