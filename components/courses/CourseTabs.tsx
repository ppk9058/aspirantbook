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
            <div className="flex items-center justify-center overflow-x-auto custom-scrollbar py-2">
                <div className="bg-[#F2EFE9] p-1.5 rounded-full inline-flex items-center gap-1 border border-gray-200">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onChange(tab.id)}
                                className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                                    isActive
                                        ? "bg-white text-[#10162F] shadow-sm border border-black/5 scale-[1.02]"
                                        : "text-gray-600 hover:text-[#10162F]"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                isActive
                                                    ? "bg-[#10162F] text-white"
                                                    : "bg-gray-200 text-gray-700"
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
        <div className="border-b-2 border-gray-200 overflow-x-auto custom-scrollbar">
            <div className="flex gap-4 sm:gap-6 min-w-max">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChange(tab.id)}
                            className={`relative pb-3 px-1 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                                isActive
                                    ? "text-[#10162F]"
                                    : "text-gray-500 hover:text-gray-900"
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                            isActive
                                                ? "bg-[#3A10E5] text-white font-bold"
                                                : "bg-gray-100 text-gray-500"
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </span>

                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3A10E5] rounded-full" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
