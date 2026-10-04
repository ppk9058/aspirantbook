export default function SubscriptionLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
        <div className="h-4 w-80 bg-gray-200 dark:bg-slate-800 rounded mx-auto"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-6 w-32 bg-gray-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-44 bg-gray-200 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
            </div>

            <div className="h-10 w-28 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>

            <div className="space-y-3 border-t border-gray-100 dark:border-slate-800 pt-6">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
              ))}
            </div>

            <div className="h-12 w-full bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
