"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BackButtonProps {
    fallbackUrl?: string
    label?: string
}

export default function BackButton({ fallbackUrl = "/", label = "Back" }: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push(fallbackUrl)
        }
    }

    return (
        <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 -ml-2"
        >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {label}
        </Button>
    )
}
