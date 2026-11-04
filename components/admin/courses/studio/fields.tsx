"use client"

import type { ReactNode } from "react"

/** Shared studio form primitives (mobile-first, 44px targets, labelled). */

export function Field({
  label,
  hint,
  htmlFor,
  children,
  required,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-bold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

export const inputClass =
  "min-h-[44px] w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  lang,
  type = "text",
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  lang?: string
  type?: string
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      lang={lang}
      className={inputClass}
    />
  )
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  lang,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  lang?: string
}) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      lang={lang}
      className={inputClass}
    />
  )
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function StudioSection({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-gray-500">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
      {message}
    </p>
  )
}

export function InlineSuccess({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
      {message}
    </p>
  )
}
