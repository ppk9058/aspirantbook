export default function MyTestsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-4 w-72 bg-gray-200 dark:bg-slate-800 rounded"></div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 pb-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-5 w-40 bg-gray-200 dark:bg-slate-800 rounded"></div>
              <div className="h-5 w-16 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
            </div>
            <div className="h-4 w-52 bg-gray-200 dark:bg-slate-800 rounded"></div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-800">
              <div className="h-4 w-24 bg-gray-200 dark:bg-slate-800 rounded"></div>
              <div className="h-9 w-24 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
