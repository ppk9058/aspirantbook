"use client"

import { useState, useMemo } from "react"
import {
  Info,
  Layers,
  BookOpen,
  Users,
  HelpCircle,
  Calendar,
  Sparkles,
  GraduationCap,
  Star,
  Award,
  FileText,
  CheckCircle2,
  Target,
  Video,
  Clock,
  Bookmark,
  Globe,
  Lightbulb,
  X,
  Search,
  Upload,
  Check,
  Compass,
  Zap,
  TrendingUp,
  Shield,
  FileCheck,
  Folder,
  Code,
  Flame,
  Heart,
  Briefcase,
  PenTool,
  Trophy,
  BarChart2,
  Activity,
  Bell,
  Cpu,
  Monitor,
  Headphones,
  MapPin,
  Share2,
  type LucideIcon,
} from "lucide-react"

export const AVAILABLE_ICONS: Record<string, LucideIcon> = {
  info: Info,
  layers: Layers,
  bookOpen: BookOpen,
  users: Users,
  helpCircle: HelpCircle,
  calendar: Calendar,
  sparkles: Sparkles,
  graduationCap: GraduationCap,
  star: Star,
  award: Award,
  fileText: FileText,
  checkCircle2: CheckCircle2,
  target: Target,
  video: Video,
  clock: Clock,
  bookmark: Bookmark,
  globe: Globe,
  lightbulb: Lightbulb,
  compass: Compass,
  zap: Zap,
  trendingUp: TrendingUp,
  shield: Shield,
  fileCheck: FileCheck,
  folder: Folder,
  code: Code,
  flame: Flame,
  heart: Heart,
  briefcase: Briefcase,
  penTool: PenTool,
  trophy: Trophy,
  barChart2: BarChart2,
  activity: Activity,
  bell: Bell,
  cpu: Cpu,
  monitor: Monitor,
  headphones: Headphones,
  mapPin: MapPin,
  share2: Share2,
}

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  label?: string
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [customSvgInput, setCustomSvgInput] = useState("")
  const [tab, setTab] = useState<"library" | "custom">("library")

  const isCustomSvg = typeof value === "string" && (value.startsWith("<svg") || value.startsWith("data:image/svg+xml"))

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return Object.entries(AVAILABLE_ICONS)
    return Object.entries(AVAILABLE_ICONS).filter(([key]) => key.toLowerCase().includes(q))
  }, [search])

  const CurrentIcon = !isCustomSvg && AVAILABLE_ICONS[value] ? AVAILABLE_ICONS[value] : AVAILABLE_ICONS.sparkles

  const handleCustomSvgUpload = (file: File) => {
    if (!file.name.endsWith(".svg")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const svgText = e.target?.result as string
      if (svgText && svgText.includes("<svg")) {
        onChange(svgText)
        setOpen(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="relative inline-block text-xs">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs cursor-pointer"
          title="Choose icon"
        >
          {isCustomSvg ? (
            <div
              className="w-4 h-4 text-orange-600 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <CurrentIcon className="w-4 h-4 text-orange-600 shrink-0" />
          )}
          <span className="capitalize">{isCustomSvg ? "Custom SVG" : value || "Choose"}</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-72 p-3 bg-white rounded-xl border border-gray-200 shadow-xl space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("library")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  tab === "library" ? "bg-orange-100 text-orange-800" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Lucide Icons
              </button>
              <button
                type="button"
                onClick={() => setTab("custom")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  tab === "custom" ? "bg-orange-100 text-orange-800" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Custom SVG
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {tab === "library" ? (
            <>
              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search icons (e.g. star, book, target)..."
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-gray-50 font-medium focus:outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              {/* Icon Grid */}
              <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto p-1">
                {filteredIcons.length === 0 ? (
                  <p className="col-span-6 text-center py-4 text-[11px] text-gray-400">No icons match</p>
                ) : (
                  filteredIcons.map(([key, IconComponent]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChange(key)
                        setOpen(false)
                      }}
                      className={`p-2 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer ${
                        value === key ? "bg-orange-100 text-orange-700 font-bold" : "text-gray-600"
                      }`}
                      title={key}
                    >
                      <IconComponent className="w-4 h-4" />
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-1 text-xs">
              <label className="block text-[11px] font-bold text-gray-700">Paste raw SVG markup:</label>
              <textarea
                rows={3}
                value={customSvgInput}
                onChange={(e) => setCustomSvgInput(e.target.value)}
                placeholder='<svg viewBox="0 0 24 24" ...>...</svg>'
                className="w-full p-2 font-mono text-[10px] rounded-lg border border-gray-200 focus:outline-none focus:border-orange-500"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[11px] font-bold text-gray-700 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3 text-orange-600" />
                  <span>Upload .svg</span>
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCustomSvgUpload(e.target.files[0])
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  disabled={!customSvgInput.trim().includes("<svg")}
                  onClick={() => {
                    onChange(customSvgInput.trim())
                    setOpen(false)
                  }}
                  className="px-3 py-1 rounded-lg bg-orange-600 text-white font-bold text-[11px] disabled:opacity-40 cursor-pointer"
                >
                  Apply SVG
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
