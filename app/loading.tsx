export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-pulse">
            <div className="h-20 border-b border-gray-100" />
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-6">
                <div className="h-10 w-72 bg-gray-200 rounded" />
                <div className="h-5 w-96 bg-gray-100 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-64 bg-gray-100 rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
