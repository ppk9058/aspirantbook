"use client"

export function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(false)
            return
        }
        if ((window as any).Razorpay) {
            resolve(true)
            return
        }
        const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null
        if (existing) {
            if ((window as any).Razorpay) {
                resolve(true)
                return
            }
            existing.addEventListener("load", () => resolve(true), { once: true })
            existing.addEventListener("error", () => resolve(false), { once: true })
            return
        }

        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.head.appendChild(script)
    })
}
