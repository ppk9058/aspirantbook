import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor } from "lucide-react"

export default function CodeAlongPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Code Along</h1>
                <p className="text-gray-600 mt-1">Follow along with interactive coding sessions</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5" />
                        Coming Soon
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        Code-along sessions will be available here. This feature is currently under development.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
