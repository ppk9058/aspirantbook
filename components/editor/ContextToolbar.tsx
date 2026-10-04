"use client"

import React, { useState } from "react"
import {
    Edit3,
    Plus,
    ArrowUp,
    ArrowDown,
    Trash2,
    Copy,
    Heading,
    Layers,
    ChevronDown
} from "lucide-react"

export interface ContextToolbarProps {
    onEdit?: () => void
    onAddContent?: () => void
    onAddHeading?: () => void
    onAddSubtopic?: () => void
    onDuplicate?: () => void
    onMoveUp?: () => void
    onMoveDown?: () => void
    onDelete?: () => void
    canMoveUp?: boolean
    canMoveDown?: boolean
    label?: string
    className?: string
}

export function ContextToolbar({
    onEdit,
    onAddContent,
    onAddHeading,
    onAddSubtopic,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onDelete,
    canMoveUp = true,
    canMoveDown = true,
    label,
    className = "",
}: ContextToolbarProps) {
    const [showAddMenu, setShowAddMenu] = useState(false)

    return (
        <div
            className={`relative inline-flex items-center gap-1 bg-[#10162F] text-white p-1 rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_#FFD15C] text-xs font-bold transition-all ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="px-2 py-1 rounded-lg hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                    title={`Edit ${label || "Item"}`}
                >
                    <Edit3 className="h-3.5 w-3.5 text-[#FFD15C]" />
                    <span>Edit</span>
                </button>
            )}

            {/* Direct Add or Multi-Add Dropdown */}
            {onAddContent && !onAddHeading && !onAddSubtopic && (
                <button
                    type="button"
                    onClick={onAddContent}
                    className="px-2 py-1 rounded-lg hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                    title="Add Lesson / Content"
                >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>+ Add</span>
                </button>
            )}

            {(onAddHeading || onAddSubtopic) && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="px-2 py-1 rounded-lg hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                        title="Add Content..."
                    >
                        <Plus className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Add</span>
                        <ChevronDown className="h-3 w-3 text-gray-300" />
                    </button>

                    {showAddMenu && (
                        <div
                            className="absolute right-0 top-full mt-1.5 w-44 bg-[#10162F] border-2 border-[#FFD15C] rounded-xl shadow-[4px_4px_0px_#10162F] p-1 z-30 space-y-0.5"
                            onClick={() => setShowAddMenu(false)}
                        >
                            {onAddContent && (
                                <button
                                    type="button"
                                    onClick={onAddContent}
                                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/15 text-left text-xs font-bold text-white flex items-center gap-2"
                                >
                                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>+ Lesson Article</span>
                                </button>
                            )}
                            {onAddHeading && (
                                <button
                                    type="button"
                                    onClick={onAddHeading}
                                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/15 text-left text-xs font-bold text-white flex items-center gap-2"
                                >
                                    <Heading className="h-3.5 w-3.5 text-[#FFD15C]" />
                                    <span>+ Module Heading</span>
                                </button>
                            )}
                            {onAddSubtopic && (
                                <button
                                    type="button"
                                    onClick={onAddSubtopic}
                                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/15 text-left text-xs font-bold text-white flex items-center gap-2"
                                >
                                    <Layers className="h-3.5 w-3.5 text-sky-400" />
                                    <span>+ Subtopic Section</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {onDuplicate && (
                <button
                    type="button"
                    onClick={onDuplicate}
                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                    title={`Duplicate ${label || "Item"}`}
                >
                    <Copy className="h-3.5 w-3.5 text-amber-300" />
                </button>
            )}

            {onMoveUp && canMoveUp && (
                <button
                    type="button"
                    onClick={onMoveUp}
                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                    title="Move Up"
                >
                    <ArrowUp className="h-3.5 w-3.5" />
                </button>
            )}

            {onMoveDown && canMoveDown && (
                <button
                    type="button"
                    onClick={onMoveDown}
                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                    title="Move Down"
                >
                    <ArrowDown className="h-3.5 w-3.5" />
                </button>
            )}

            {onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="p-1 rounded-lg hover:bg-red-600/80 text-red-300 hover:text-white transition-colors ml-0.5"
                    title={`Delete ${label || "Item"}`}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    )
}
