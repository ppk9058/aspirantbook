import { auth } from "@/auth"
import { Metadata } from "next"
import CurrentAffairsQuizzesClient from "@/components/quizzes/CurrentAffairsQuizzesClient"

export const metadata: Metadata = {
    title: "Current Affairs and Quizzes | aspirantbook",
    description: "Daily speed tests, monthly current affairs roundups, and general awareness quizzes for competitive examinations.",
}

export default async function CurrentAffairsQuizzesPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <CurrentAffairsQuizzesClient />
        </div>
    )
}
