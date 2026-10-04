import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban } from "lucide-react"

export default function ProjectsPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Real World Projects</h1>
                <p className="text-gray-600 mt-1">Apply your skills to real-world scenarios</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5" />
                        Coming Soon
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        Real-world projects will be available here. This feature is currently under development.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
