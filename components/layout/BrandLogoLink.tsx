"use client"

import BrandLogo from "@/components/brand/BrandLogo"

interface BrandLogoLinkProps {
    collapsed?: boolean
    className?: string
}

export default function BrandLogoLink({ collapsed = false, className = "" }: BrandLogoLinkProps) {
    return (
        <BrandLogo
            size="md"
            collapsed={collapsed}
            className={className}
            data-testid="brand-logo"
        />
    )
}
