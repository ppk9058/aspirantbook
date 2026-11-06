"use client"

import React, { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("PreviewErrorBoundary caught an error:", error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const reason = this.state.error?.message || "Unknown rendering error"
      return (
        <div
          data-testid="preview-error-boundary"
          className="m-6 flex flex-col items-center justify-center rounded-2xl border border-amber-300 bg-amber-50/90 p-8 text-center text-amber-950 shadow-sm"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-200 text-amber-800">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold tracking-tight text-amber-900">
            Preview unavailable: {reason}
          </h3>
          <p className="mt-1 max-w-md text-xs text-amber-800">
            A field in your draft contains unexpected or incomplete data. Edit your draft or click below to retry.
          </p>
          <button
            type="button"
            onClick={this.resetError}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-900 cursor-pointer shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Preview</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
