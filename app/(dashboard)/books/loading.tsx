export default function BooksLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search & Category Chips Skeleton */}
      <div className="h-12 bg-gray-200 dark:bg-slate-800 rounded-2xl w-full"></div>
      <div className="flex gap-2 overflow-hidden py-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-9 w-24 bg-gray-200 dark:bg-slate-800 rounded-full shrink-0"></div>
        ))}
      </div>

      {/* Book Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 p-3 space-y-3">
            <div className="h-44 sm:h-52 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
