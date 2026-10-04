import { TrackForm } from "@/components/admin/tracks/TrackForm"

export default function CreateTrackPage() {
    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Create Track</h1>
                <p className="text-muted-foreground">
                    Create a new learning path for students
                </p>
            </div>

            <div className="border rounded-lg p-6 bg-card">
                <TrackForm />
            </div>
        </div>
    )
}
