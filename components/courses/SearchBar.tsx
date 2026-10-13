"use client"

import { Search, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export default function SearchBar({
    value,
    onChange,
    placeholder = "Search courses, topics, keywords...",
}: SearchBarProps) {
    const [localValue, setLocalValue] = useState(value)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useEffect(() => {
        if (localValue === value) return
        const timer = setTimeout(() => {
            onChangeRef.current(localValue)
        }, 250)

        return () => clearTimeout(timer)
    }, [localValue, value])

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    return (
        <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1448d8] focus:border-transparent transition-all shadow-xs"
            />
            {localValue && (
                <button
                    onClick={() => setLocalValue("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full"
                    aria-label="Clear search"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    )
}
