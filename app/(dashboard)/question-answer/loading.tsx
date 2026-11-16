export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse" role="status" aria-label="Loading questions">
      <div className="h-7 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-gray-900" />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3">
          <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-900" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-900" />
          ))}
        </div>
        <div className="lg:col-span-4">
          <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-900" />
        </div>
      </div>
    </div>
  )
}
