"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X, RotateCcw } from "lucide-react"

interface FilterSidebarProps {
    filters: {
        technologies: string[]
        difficulty: string
        durationMin: number
        durationMax: number
        type: 'all' | 'free' | 'premium'
    }
    onChange: (filters: any) => void
    onClose?: () => void
}

const TECHNOLOGIES = [
    "Python",
    "JavaScript",
    "SQL",
    "React",
    "Data Science",
    "Machine Learning",
    "AI",
    "Next.js",
]

const DIFFICULTY_OPTIONS = [
    { value: 'all', label: 'All Levels' },
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' }
]

export default function FilterSidebar({ filters, onChange, onClose }: FilterSidebarProps) {
    const handleTechnologyToggle = (tech: string) => {
        const newTechs = filters.technologies.includes(tech)
            ? filters.technologies.filter(t => t !== tech)
            : [...filters.technologies, tech]
        onChange({ ...filters, technologies: newTechs })
    }

    const handleDifficultyChange = (difficulty: string) => {
        onChange({ ...filters, difficulty })
    }

    const handleTypeChange = (type: 'all' | 'free' | 'premium') => {
        onChange({ ...filters, type })
    }

    const handleClearAll = () => {
        onChange({
            technologies: [],
            difficulty: 'all',
            durationMin: 0,
            durationMax: 50,
            type: 'all'
        })
    }

    const hasActiveFilters =
        filters.technologies.length > 0 ||
        filters.difficulty !== 'all' ||
        filters.type !== 'all'

    return (
        <div className="w-full lg:w-[260px] bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filters</h3>
                <div className="flex items-center gap-1.5">
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearAll}
                            className="text-[11px] font-medium text-[#3AAFA9] hover:underline flex items-center gap-1"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                        </button>
                    )}
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="lg:hidden h-7 w-7 p-0 rounded-lg"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Course Type Filter */}
            <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">
                    Access Tier
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'free', 'premium'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTypeChange(t)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                                filters.type === t
                                    ? "bg-[#3AAFA9] text-white shadow-xs"
                                    : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Difficulty Filter */}
            <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">
                    Difficulty
                </h4>
                <div className="space-y-1">
                    {DIFFICULTY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleDifficultyChange(option.value)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filters.difficulty === option.value
                                    ? "bg-[#3AAFA9]/15 text-[#3AAFA9] font-bold"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Technology Filters */}
            <div className="pt-4">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">
                    Topics & Tech
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {TECHNOLOGIES.map((tech) => (
                        <div key={tech} className="flex items-center space-x-2.5">
                            <Checkbox
                                id={`tech-${tech}`}
                                checked={filters.technologies.includes(tech)}
                                onCheckedChange={() => handleTechnologyToggle(tech)}
                                className="rounded data-[state=checked]:bg-[#3AAFA9] data-[state=checked]:border-[#3AAFA9]"
                            />
                            <Label
                                htmlFor={`tech-${tech}`}
                                className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                            >
                                {tech}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Apply Button */}
            {onClose && (
                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 lg:hidden">
                    <Button
                        onClick={onClose}
                        className="w-full bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-semibold py-2 rounded-xl"
                    >
                        Apply Filters
                    </Button>
                </div>
            )}
        </div>
    )
}
