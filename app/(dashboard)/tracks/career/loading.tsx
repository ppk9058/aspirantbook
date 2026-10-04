export default function CareerTrackLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Hero Skeleton */}
            <div className="h-64 bg-gray-200 rounded-2xl"></div>

            {/* Filters Skeleton */}
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 w-32 bg-gray-200 rounded"></div>
                ))}
            </div>

            {/* Tracks Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-6 border">
                        <div className="space-y-4">
                            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
