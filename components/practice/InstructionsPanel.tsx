"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Lightbulb, CheckCircle2, List } from "lucide-react"

interface InstructionsPanelProps {
    title: string
    instructions: string
    xp: number
    onTakeHint: () => void
}

export function InstructionsPanel({
    title,
    instructions,
    xp,
    onTakeHint
}: InstructionsPanelProps) {
    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center h-10 px-4 border-b bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded text-xs font-medium text-gray-700">
                    <List className="h-3 w-3" />
                    Instructions
                </div>
            </div>

            <ScrollArea className="flex-1 p-6">
                <h1 className="text-2xl font-bold mb-4 text-gray-900">{title}</h1>

                <div className="prose prose-sm max-w-none text-gray-600 mb-8">
                    <div dangerouslySetInnerHTML={{ __html: instructions }} />
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-8">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                        Goal
                        <span className="ml-auto bg-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {xp} XP
                        </span>
                    </h3>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2 pl-1">
                        <li>Follow the instructions carefully.</li>
                        <li>Write your code in the editor.</li>
                        <li>Run your code to test it.</li>
                        <li>Submit when you are ready!</li>
                    </ul>
                </div>

                <Button
                    variant="outline"
                    onClick={onTakeHint}
                    className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                    <Lightbulb className="h-4 w-4" />
                    Take Hint (-30 XP)
                </Button>
            </ScrollArea>
        </div>
    )
}
