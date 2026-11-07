/**
 * Shared layout route helpers to keep route-based layout decisions consistent
 * across DashboardShell, LeftSidebar, and navigation components.
 */

export function isBooksRoute(pathname: string | null | undefined): boolean {
    return Boolean(pathname && pathname.startsWith("/books"))
}
