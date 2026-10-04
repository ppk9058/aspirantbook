"use client"

import React, { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TutorialImportModal } from "./TutorialImportModal"

export function TutorialStudioImportButton() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Button
                type="button"
                onClick={() => setIsOpen(true)}
                className="bg-white hover:bg-gray-50 text-[#10162F] font-extrabold border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
                <Sparkles className="h-4 w-4 text-[#3A10E5]" />
                <span>📥 Import from AI / JSON</span>
            </Button>

            <TutorialImportModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
