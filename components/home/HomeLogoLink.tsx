"use client"

import BrandLogo from "@/components/brand/BrandLogo"

/**
 * C1: the landing page used to read the session on the server just to point the
 * brand logo at "/" for a visitor and at their dashboard for a signed-in user.
 *
 * The link is now resolved on the client from the session that SessionProvider
 * already loads, delegating to the unified BrandLogo component.
 */
export default function HomeLogoLink() {
    return (
        <BrandLogo
            size="lg"
            priority
            data-testid="home-brand-link"
        />
    )
}
