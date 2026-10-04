"use client"

import React from "react"
import {
  FileText,
  Download,
  ExternalLink,
  Code,
  Layers,
  Sparkles,
} from "lucide-react"
import type { ClassResource } from "@/lib/classroom-service"

interface ResourcePanelProps {
  resources: ClassResource[]
}

export default function ResourcePanel({ resources }: ResourcePanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-400" />
      case "code":
        return <Code className="h-5 w-5 text-emerald-400" />
      case "slides":
        return <Layers className="h-5 w-5 text-purple-400" />
      default:
        return <FileText className="h-5 w-5 text-orange-400" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0D1527] text-white p-4 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#F26522]" />
            <span>Classroom Study Resources</span>
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Official teacher notes, formula cheat sheets &amp; practice files
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {resources.map((res) => (
          <div
            key={res.id}
            className="p-4 rounded-2xl bg-[#131C31] border border-gray-800 hover:border-gray-700 transition-all flex items-start justify-between gap-3 group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-gray-800/80 shrink-0 mt-0.5">
                {getIcon(res.type)}
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="font-bold text-xs text-white group-hover:text-[#5B47FB] transition-colors leading-snug break-words">
                  {res.title}
                </h4>
                {res.description && (
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {res.description}
                  </p>
                )}
                {res.size && (
                  <span className="text-[10px] text-gray-500 font-mono block">
                    {res.size}
                  </span>
                )}
              </div>
            </div>

            <a
              href={res.url}
              download
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-gray-800 hover:bg-[#5B47FB] text-gray-300 hover:text-white transition-all shrink-0 cursor-pointer"
              title="Download Resource"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
