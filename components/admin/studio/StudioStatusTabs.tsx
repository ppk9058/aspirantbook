"use client"

import React from "react"

export interface StudioTabItem<T extends string = string> {
  id: T
  label: string
  count?: number
}

export interface StudioStatusTabsProps<T extends string = string> {
  tabs: StudioTabItem<T>[]
  activeTab: T
  onTabChange: (tabId: T) => void
  className?: string
}

export function StudioStatusTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: StudioStatusTabsProps<T>) {
  return (
    <div className={`overflow-x-auto no-scrollbar scroll-smooth ${className}`}>
      <div
        className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 min-w-max"
        data-scroll-x="true"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              data-testid={`studio-tab-${tab.id.toLowerCase()}`}
              aria-selected={isActive}
              role="tab"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer shrink-0 whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-[#00A8FF] ${
                isActive
                  ? "bg-white dark:bg-[#071d33] text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-700/60 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default StudioStatusTabs
