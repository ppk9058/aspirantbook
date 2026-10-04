"use client"

import { ReactNode } from "react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { GripVertical } from "lucide-react"

interface ResizableLayoutProps {
    leftPanel: ReactNode
    rightTopPanel: ReactNode
    rightBottomPanel: ReactNode
}

export function ResizableLayout({
    leftPanel,
    rightTopPanel,
    rightBottomPanel,
}: ResizableLayoutProps) {
    return (
        <PanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Panel (Instructions) */}
            <Panel defaultSize={40} minSize={20} className="bg-white">
                {leftPanel}
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-[#3AAFA9] transition-colors flex items-center justify-center group z-10">
                <div className="h-8 w-1 bg-gray-300 rounded-full group-hover:bg-white" />
            </PanelResizeHandle>

            {/* Right Side (Editor + Output) */}
            <Panel defaultSize={60} minSize={30}>
                <PanelGroup direction="vertical">
                    {/* Top Right (Editor) */}
                    <Panel defaultSize={70} minSize={30} className="bg-[#1e1e1e]">
                        {rightTopPanel}
                    </Panel>

                    <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-[#3AAFA9] transition-colors flex items-center justify-center group z-10">
                        <div className="w-8 h-1 bg-gray-600 rounded-full group-hover:bg-white" />
                    </PanelResizeHandle>

                    {/* Bottom Right (Output/Test Runner) */}
                    <Panel defaultSize={30} minSize={10} className="bg-[#1e1e1e]">
                        {rightBottomPanel}
                    </Panel>
                </PanelGroup>
            </Panel>
        </PanelGroup>
    )
}
