import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export default function LeaderboardPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
                <p className="text-gray-600 mt-1">See how you rank against other learners</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Coming Soon
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        The leaderboard will show top learners by XP. This feature is currently under development.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
