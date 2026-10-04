export default function Loading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Welcome Banner Skeleton */}
            <div className="h-32 bg-gray-200 rounded-lg"></div>

            {/* Browse Courses Skeleton */}
            <div>
                <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                            <div className="h-[200px] bg-gray-200"></div>
                            <div className="p-5 space-y-3">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
            </div>
        </div>
    )
}
