"use client"

interface Tab {
    id: string
    label: string
    count?: number
}

interface CourseTabsProps {
    tabs: Tab[]
    activeTab: string
    onChange: (tabId: string) => void
    variant?: "pills" | "underline"
}

export default function CourseTabs({ tabs, activeTab, onChange, variant = "pills" }: CourseTabsProps) {
    if (variant === "pills") {
        return (
            <div data-scroll-x="true" className="w-full overflow-x-auto custom-scrollbar py-2 no-scrollbar">
                <div className="bg-[#F2EFE9] dark:bg-slate-800/80 p-1.5 rounded-full inline-flex items-center gap-1 border border-gray-200 dark:border-slate-700">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onChange(tab.id)}
                                className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer min-h-[40px] shrink-0 ${
                                    isActive
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-black/5 dark:border-white/10 scale-[1.02]"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                isActive
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                                    : "bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div data-scroll-x="true" className="border-b-2 border-gray-200 dark:border-gray-800 overflow-x-auto custom-scrollbar no-scrollbar">
            <div className="flex gap-4 sm:gap-6 min-w-max">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChange(tab.id)}
                            className={`relative pb-3 px-1 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer min-h-[44px] flex items-center ${
                                isActive
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                            isActive
                                                ? "bg-indigo-600 dark:bg-indigo-500 text-white font-bold"
                                                : "bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </span>

                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
