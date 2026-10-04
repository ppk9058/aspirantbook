"use client"

import { Button } from "@/components/ui/button"
import { Play, RotateCcw, Volume2, Maximize, FileText, Smartphone } from "lucide-react"

interface VideoPlayerProps {
    title: string
    onComplete: () => void
}

export function VideoPlayer({ title, onComplete }: VideoPlayerProps) {
    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-8 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>

            {/* Video Container */}
            <div className="flex-1 px-8 pb-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl aspect-video bg-white relative shadow-lg rounded-lg overflow-hidden border border-gray-200">
                    {/* Video Placeholder Content */}
                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="text-center">
                            <h2 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">
                                WHAT IS THE
                                <br />
                                <span className="text-green-500 text-shadow-sm">OpenAI API?</span>
                            </h2>
                            <div className="flex items-center justify-center gap-2 mt-8">
                                <div className="h-8 w-8">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-900">
                                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-gray-900">datacamp</span>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600" />
                        <div className="absolute top-1/2 right-0 w-24 h-48 bg-green-400" />
                        <div className="absolute bottom-0 left-0 w-24 h-48 bg-green-400" />
                    </div>

                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-900/90 flex items-center justify-between px-4 text-white">
                        <div className="flex items-center gap-4">
                            <button className="hover:text-green-400"><Play className="h-5 w-5 fill-current" /></button>
                            <button className="hover:text-green-400"><RotateCcw className="h-5 w-5" /></button>
                            <button className="hover:text-green-400"><RotateCcw className="h-5 w-5 rotate-180" /></button>
                            <div className="flex items-center gap-2">
                                <Volume2 className="h-5 w-5" />
                                <div className="w-20 h-1 bg-gray-600 rounded-full">
                                    <div className="w-3/4 h-full bg-white rounded-full" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-mono">
                            <span>-3:42</span>
                            <button className="hover:text-green-400">1.5x</button>
                            <button className="hover:text-green-400"><FileText className="h-5 w-5" /></button>
                            <button className="hover:text-green-400"><Maximize className="h-5 w-5" /></button>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="w-full max-w-4xl mt-6 flex items-center justify-between">
                    <Button variant="outline" className="text-gray-700 border-gray-300">
                        Show Transcript
                    </Button>

                    <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                        <Smartphone className="h-4 w-4" />
                        <span>This course is also available on the mobile app.</span>
                        <a href="#" className="hover:underline">Continue learning on mobile.</a>
                    </div>

                    <Button
                        onClick={onComplete}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold px-8"
                    >
                        Got It!
                    </Button>
                </div>
            </div>
        </div>
    )
}
