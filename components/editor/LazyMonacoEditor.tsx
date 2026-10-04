"use client"

import React, { useState, useEffect } from "react"
import Editor, { EditorProps } from "@monaco-editor/react"

export default function LazyMonacoEditor(props: EditorProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-full h-full min-h-[200px] bg-[#1e1e1e] flex items-center justify-center text-gray-400 text-xs font-mono" aria-hidden="true">
                Loading code editor...
            </div>
        )
    }

    return <Editor {...props} />
}
