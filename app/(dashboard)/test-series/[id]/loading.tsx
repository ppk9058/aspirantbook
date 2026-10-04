export default function TestSeriesDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-gray-200 dark:bg-slate-800 rounded"></div>

      {/* Series Hero Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-slate-800 rounded-2xl shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-7 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Tabs & Test Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-72 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-2/3"></div>
                <div className="h-5 w-16 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-24"></div>
                <div className="h-9 w-28 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
