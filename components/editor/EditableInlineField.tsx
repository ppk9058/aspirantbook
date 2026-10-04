"use client"

import React, { useState, useRef, useEffect } from "react"
import { Edit2, Check, X, Loader2 } from "lucide-react"

export interface EditableInlineFieldProps {
    value: string | number
    onSave: (newValue: any) => Promise<void>
    isEditor?: boolean
    type?: "text" | "number" | "select" | "textarea"
    options?: { label: string; value: string }[]
    placeholder?: string
    label?: string
    className?: string
    displayClassName?: string
    renderDisplay?: (val: any) => React.ReactNode
}

export function EditableInlineField({
    value,
    onSave,
    isEditor = false,
    type = "text",
    options = [],
    placeholder = "Click to edit...",
    label,
    className = "",
    displayClassName = "",
    renderDisplay,
}: EditableInlineFieldProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState<any>(value)
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<any>(null)

    useEffect(() => {
        setEditValue(value)
    }, [value])

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            if (inputRef.current.select) {
                inputRef.current.select()
            }
        }
    }, [isEditing])

    if (!isEditor) {
        return renderDisplay ? (
            <>{renderDisplay(value)}</>
        ) : (
            <span className={displayClassName}>{value}</span>
        )
    }

    const handleSave = async () => {
        if (editValue === value) {
            setIsEditing(false)
            return
        }

        setIsSaving(true)
        try {
            await onSave(editValue)
            setIsEditing(false)
        } catch (err) {
            console.error("Failed to save inline edit:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && type !== "textarea") {
            e.preventDefault()
            handleSave()
        } else if (e.key === "Escape") {
            e.preventDefault()
            setEditValue(value)
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <div className={`inline-flex items-center gap-1.5 p-1 bg-white border-2 border-[#10162F] rounded-lg shadow-[2px_2px_0px_#10162F] z-10 ${className}`}>
                {type === "select" ? (
                    <select
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        disabled={isSaving}
                        className="text-xs sm:text-sm font-bold bg-transparent text-[#10162F] focus:outline-none px-1"
                        onKeyDown={handleKeyDown}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : type === "textarea" ? (
                    <textarea
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        disabled={isSaving}
                        rows={2}
                        placeholder={placeholder}
                        className="text-xs sm:text-sm font-bold bg-transparent text-[#10162F] focus:outline-none px-1 min-w-[200px]"
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <input
                        ref={inputRef}
                        type={type}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        disabled={isSaving}
                        placeholder={placeholder}
                        className="text-xs sm:text-sm font-bold bg-transparent text-[#10162F] focus:outline-none px-1 min-w-[120px]"
                        onKeyDown={handleKeyDown}
                    />
                )}

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-1 rounded bg-[#3A10E5] hover:bg-[#300ec2] text-white transition-colors"
                    title="Save (Enter)"
                >
                    {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Check className="h-3.5 w-3.5" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setEditValue(value)
                        setIsEditing(false)
                    }}
                    disabled={isSaving}
                    className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                    title="Cancel (Esc)"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        )
    }

    return (
        <span
            onClick={() => setIsEditing(true)}
            className={`group relative cursor-pointer inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 border border-transparent hover:border-dashed hover:border-[#3A10E5] hover:bg-[#3A10E5]/5 transition-all ${className}`}
            title={`Click to edit ${label || ""}`}
        >
            {renderDisplay ? renderDisplay(value) : <span className={displayClassName}>{value || <span className="italic text-gray-400">{placeholder}</span>}</span>}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#3A10E5]">
                <Edit2 className="h-3 w-3 inline" />
            </span>
        </span>
    )
}
