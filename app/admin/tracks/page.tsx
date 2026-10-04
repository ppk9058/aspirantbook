import { getTracks } from "@/lib/actions/admin/tracks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreVertical, BookOpen, GripVertical } from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default async function TracksPage() {
    const { tracks } = await getTracks()

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tracks</h1>
                    <p className="text-muted-foreground">
                        Manage learning paths and career tracks
                    </p>
                </div>
                <Link href="/admin/tracks/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Track
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4">
                {tracks?.map((track) => (
                    <Card key={track.id}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-md cursor-move">
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">{track.title}</h3>
                                        <Badge variant={track.isPublished ? "default" : "secondary"}>
                                            {track.isPublished ? "Published" : "Draft"}
                                        </Badge>
                                        <Badge variant="outline">{track.type}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {track.description}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-4 w-4" />
                                            {track._count.courses} Courses
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <Link href={`/admin/tracks/${track.id}`}>
                                        <DropdownMenuItem>Edit</DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem className="text-red-600">
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardContent>
                    </Card>
                ))}

                {tracks?.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-semibold">No tracks created</h3>
                        <p className="text-muted-foreground mb-4">
                            Get started by creating your first learning track
                        </p>
                        <Link href="/admin/tracks/create">
                            <Button>Create Track</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
