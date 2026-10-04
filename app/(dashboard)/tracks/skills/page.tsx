import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"

export default function SkillTracksPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Skill Tracks</h1>
                <p className="text-gray-600 mt-1">Master specific skills with focused learning paths</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Coming Soon
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        Skill tracks will help you master specific technologies. This feature is currently under development.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
