"use client"

import React from "react"
import {
    Landmark,
    Building,
    GraduationCap,
    BookOpen,
    BookMarked,
    Code2,
    ShieldCheck,
    Atom,
    Target,
    Compass,
    Sparkles,
    Users,
    Layers,
    LucideIcon
} from "lucide-react"

const ICONS_MAP: Record<string, LucideIcon> = {
    Landmark,
    Building,
    GraduationCap,
    BookOpen,
    BookMarked,
    Code2,
    ShieldCheck,
    Atom,
    Target,
    Compass,
    Sparkles,
    Users,
    Layers,
}

export default function GoalIcon({
    name,
    className = "h-4 w-4",
}: {
    name?: string
    className?: string
}) {
    if (!name) return <Target className={className} />
    const IconComponent = ICONS_MAP[name] || Target
    return <IconComponent className={className} />
}
