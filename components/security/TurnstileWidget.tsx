"use client"

import React, { useEffect, useRef } from "react"

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void
  onError?: (error: any) => void
  onExpire?: () => void
  theme?: "light" | "dark" | "auto"
  size?: "normal" | "compact"
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "error-callback"?: (error: any) => void
          "expired-callback"?: () => void
          theme?: string
          size?: string
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // If site key is not configured, gracefully skip rendering without throwing
  if (!siteKey) {
    return null
  }

  useEffect(() => {
    let isMounted = true

    function renderWidget() {
      if (!isMounted || !containerRef.current || !window.turnstile) return

      try {
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey!,
          callback: (token: string) => {
            if (onVerify) onVerify(token)
          },
          "error-callback": (err: any) => {
            if (onError) onError(err)
          },
          "expired-callback": () => {
            if (onExpire) onExpire()
          },
          theme,
          size,
        })
      } catch (e) {
        console.warn("[TurnstileWidget] Error rendering Turnstile widget:", e)
      }
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      // Load script if not already added
      const existingScript = document.getElementById("cf-turnstile-script")
      if (!existingScript) {
        const script = document.createElement("script")
        script.id = "cf-turnstile-script"
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        script.async = true
        script.defer = true
        script.onload = () => {
          renderWidget()
        }
        document.head.appendChild(script)
      } else {
        existingScript.addEventListener("load", renderWidget)
      }
    }

    return () => {
      isMounted = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
      }
    }
  }, [siteKey, theme, size, onVerify, onError, onExpire])

  return (
    <div className="my-2 flex justify-center">
      <div ref={containerRef} className="min-h-[65px]" />
    </div>
  )
}
