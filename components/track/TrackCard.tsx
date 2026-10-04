import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Clock, Trophy } from "lucide-react"
import Link from "next/link"
import { Track } from "@prisma/client"

interface TrackCardProps {
    track: Track & {
        _count: {
            courses: number
        }
    }
}

export function TrackCard({ track }: TrackCardProps) {
    return (
        <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start mb-2">
                    <Badge variant={track.type === "CAREER" ? "default" : "secondary"}>
                        {track.type === "CAREER" ? "Career Track" : "Skill Track"}
                    </Badge>
                </div>
                <h3 className="font-bold text-xl line-clamp-2">{track.title}</h3>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-muted-foreground line-clamp-3 mb-4">
                    {track.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {track._count.courses} Courses
                    </div>
                    {/* Placeholder for duration - would need to sum course durations */}
                    <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        ~20 Hours
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Link href={`/tracks/${track.slug}`} className="w-full">
                    <Button className="w-full">
                        View Track
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}
