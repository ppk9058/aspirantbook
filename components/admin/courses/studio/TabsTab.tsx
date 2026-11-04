"use client"

import { ArrowUp, ArrowDown, Eye, EyeOff, LayoutList } from "lucide-react"
import { IconPicker } from "./IconPicker"
import { StudioSection } from "./fields"

export interface StudioTabItem {
  id: string
  enabled: boolean
  label: string
  labelHi: string
  icon: string
}

export const DEFAULT_STUDIO_TABS: StudioTabItem[] = [
  { id: "about", enabled: true, label: "About", labelHi: "परिचय", icon: "info" },
  { id: "plan", enabled: true, label: "Course plan", labelHi: "कोर्स प्लान", icon: "layers" },
  { id: "syllabus", enabled: true, label: "Syllabus", labelHi: "पाठ्यक्रम", icon: "bookOpen" },
  { id: "teachers", enabled: true, label: "Teachers", labelHi: "शिक्षक", icon: "users" },
  { id: "questions", enabled: true, label: "Questions", labelHi: "प्रश्न व उत्तर", icon: "helpCircle" },
]

export type TabConfigItem = StudioTabItem
export const DEFAULT_TABS = DEFAULT_STUDIO_TABS

interface TabsTabProps {
  tabs: StudioTabItem[]
  onChange: (tabs: StudioTabItem[]) => void
  onReset: () => void
}

export function TabsTab({ tabs, onChange, onReset }: TabsTabProps) {
  const currentTabs = tabs && tabs.length > 0 ? tabs : DEFAULT_STUDIO_TABS

  const handleToggle = (index: number) => {
    const next = currentTabs.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t))
    onChange(next)
  }

  const handleUpdate = (index: number, patch: Partial<StudioTabItem>) => {
    const next = currentTabs.map((t, i) => (i === index ? { ...t, ...patch } : t))
    onChange(next)
  }

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentTabs.length) return
    const next = [...currentTabs]
    const temp = next[index]
    next[index] = next[targetIndex]
    next[targetIndex] = temp
    onChange(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>Sticky SubNav Tabs Configuration</span>
            <LayoutList className="w-5 h-5 text-orange-600" />
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure visibility, order, custom bilingual labels, and icons for the public sticky pill bar.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl cursor-pointer"
        >
          Reset Tabs
        </button>
      </div>

      <StudioSection title="Tabs Order & Labels" description="Disabled tabs will be completely hidden from the public page.">
        <div className="space-y-3">
          {currentTabs.map((tab, idx) => (
            <div
              key={tab.id}
              className={`p-4 rounded-xl border transition-all ${
                tab.enabled ? "bg-white border-gray-200 shadow-2xs" : "bg-gray-50/70 border-gray-200 opacity-60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer"
                      title="Move tab earlier"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentTabs.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer"
                      title="Move tab later"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs font-mono font-bold text-gray-400">#{idx + 1}</span>
                  <IconPicker value={tab.icon} onChange={(icon) => handleUpdate(idx, { icon })} />
                </div>

                {/* Bilingual Labels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 max-w-lg">
                  <div>
                    <input
                      type="text"
                      value={tab.label}
                      onChange={(e) => handleUpdate(idx, { label: e.target.value })}
                      placeholder="Label (English)"
                      className="w-full text-xs font-bold text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={tab.labelHi}
                      onChange={(e) => handleUpdate(idx, { labelHi: e.target.value })}
                      placeholder="Label (Hindi)"
                      className="w-full text-xs font-bold text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                </div>

                {/* Enable / Disable toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(idx)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      tab.enabled
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {tab.enabled ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-500" />}
                    <span>{tab.enabled ? "Visible" : "Hidden"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </StudioSection>
    </div>
  )
}
