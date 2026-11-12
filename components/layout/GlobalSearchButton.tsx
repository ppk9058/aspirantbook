"use client"
import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2 } from "lucide-react"
/**
 * Global search button and overlay for the landing header.
 * Searches across test series, courses, and tutorials with as-you-type results.
 */
export default function GlobalSearchButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [results, setResults] = useState<SearchResults | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const router = useRouter()
    const performSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults(null)
            setIsSearching(false)
            return
        }
        setIsSearching(true)
        try {
            const res = await fetch(`/api/search/global?q=${encodeURIComponent(searchQuery)}`)
            if (res.ok) {
                const data = await res.json()
                setResults(data)
            }
        } catch (error) {
            console.error("Search error:", error)
        } finally {
            setIsSearching(false)
        }
    }
    const handleSearch = (searchQuery: string) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            void performSearch(searchQuery)
        }, 300)
    }
    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [])
    const openSearch = () => {
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
    }
    const closeSearch = () => {
        setIsOpen(false)
        setQuery("")
        setResults(null)
    }
    useEffect(() => {
        if (!isOpen) return
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeSearch()
            }
        }
        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen, closeSearch])
    const handleQueryChange = (value: string) => {
        setQuery(value)
        handleSearch(value)
    }
    const handleResultClick = (href: string) => {
        closeSearch()
        router.push(href)
    }
    return (
        <>
            <button
                onClick={openSearch}
                aria-label="Search tests, courses and tutorials"
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 active:scale-95 dark:text-gray-200 dark:hover:bg-gray-800"
            >
                <Search className="h-4.5 w-4.5" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 backdrop-blur-sm pt-20 px-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder="Search for tests, courses, tutorials..."
                                className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none text-base"
                            />
                            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                            <button
                                onClick={closeSearch}
                                aria-label="Close search"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {!query.trim() && (
                                <div className="p-8 text-center text-sm text-slate-500">
                                    Start typing to search across tests, courses and tutorials
                                </div>
                            )}
                            {query.trim() && !isSearching && results && (
                                <div className="p-4 space-y-4">
                                    {results.testSeries.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Test Series</h3>
                                            {results.testSeries.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleResultClick(item.href)}
                                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.title}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {results.courses.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Courses</h3>
                                            {results.courses.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleResultClick(item.href)}
                                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.title}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {results.tutorials.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Tutorials</h3>
                                            {results.tutorials.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleResultClick(item.href)}
                                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.title}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {results.testSeries.length === 0 && results.courses.length === 0 && results.tutorials.length === 0 && (
                                        <div className="p-8 text-center text-sm text-slate-500">
                                            No results found for &quot;{query}&quot;
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
interface SearchResults {
    testSeries: Array<{ id: string; title: string; href: string }>
    courses: Array<{ id: string; title: string; href: string }>
    tutorials: Array<{ id: string; title: string; href: string }>
}
