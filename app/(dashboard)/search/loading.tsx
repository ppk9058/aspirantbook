export default function SearchLoading() {
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
            <div>
                <div className="h-8 w-80 bg-gray-200 rounded" />
                <div className="h-4 w-48 bg-gray-100 rounded mt-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-56 bg-gray-100 rounded-xl" />
                ))}
            </div>
        </div>
    )
}
