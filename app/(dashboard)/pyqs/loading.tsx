export default function PyqsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-4 w-96 bg-gray-200 dark:bg-slate-800 rounded"></div>
      </div>

      <div className="flex gap-2 overflow-hidden py-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 bg-gray-200 dark:bg-slate-800 rounded-full shrink-0"></div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-12 bg-gray-100 dark:bg-slate-800/60 rounded-xl"></div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-slate-800 rounded"></div>
              <div className="h-9 w-28 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
