export default function ExamFlowLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6 animate-pulse">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-slate-800 rounded"></div>
          <div className="h-6 w-20 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
        </div>

        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-4/6"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-800">
          <div className="h-10 w-24 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
