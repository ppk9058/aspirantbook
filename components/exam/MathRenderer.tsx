"use client"

import React, { useEffect, useState } from "react"

interface MathRendererProps {
    text: string
    className?: string
}

export default function MathRenderer({ text, className = "" }: MathRendererProps) {
    const [renderedHtml, setRenderedHtml] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        async function processMath() {
            try {
                // Dynamic import of katex
                const katex = await import("katex")
                if (!isMounted) return

                // Parse LaTeX blocks ($...$ or $$...$$)
                const parsed = text.replace(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, (match) => {
                    const isDisplay = match.startsWith("$$")
                    const math = isDisplay ? match.slice(2, -2) : match.slice(1, -1)
                    try {
                        return katex.default.renderToString(math, {
                            displayMode: isDisplay,
                            throwOnError: false,
                        })
                    } catch (e) {
                        return match
                    }
                })

                setRenderedHtml(parsed)
            } catch (err) {
                // Fallback to formatted text if katex is not loaded
                if (isMounted) setRenderedHtml(null)
            }
        }

        if (text && (text.includes("$") || text.includes("\\"))) {
            processMath()
        } else {
            setRenderedHtml(null)
        }

        return () => {
            isMounted = false
        }
    }, [text])

    const combinedClass = `whitespace-pre-line ${className}`.trim()

    if (renderedHtml) {
        return (
            <span
                className={`katex-math-render ${combinedClass}`}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
        )
    }

    return <span className={combinedClass}>{text}</span>
}
