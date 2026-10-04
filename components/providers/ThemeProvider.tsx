"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof document === "undefined") return "light"
        return document.documentElement.classList.contains("dark") ? "dark" : "light"
    })

    useEffect(() => {
        const savedTheme = localStorage.getItem("ts_theme") as Theme | null
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        const nextTheme = savedTheme || (prefersDark ? "dark" : "light")
        setThemeState(nextTheme)
        document.documentElement.classList.toggle("dark", nextTheme === "dark")
    }, [])

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem("ts_theme", newTheme)
        document.documentElement.classList.toggle("dark", newTheme === "dark")
    }, [])

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const nextTheme = prev === "light" ? "dark" : "light"
            localStorage.setItem("ts_theme", nextTheme)
            document.documentElement.classList.toggle("dark", nextTheme === "dark")
            return nextTheme
        })
    }, [])

    const contextValue = useMemo(
        () => ({ theme, toggleTheme, setTheme }),
        [theme, toggleTheme, setTheme]
    )

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}
