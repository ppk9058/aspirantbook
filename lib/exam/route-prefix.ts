/**
 * Helper to determine the dashboard base path for test-series management.
 * Keeps Admins under /admin/test-series and Teachers under /teacher/test-series.
 */
export function getTestSeriesBasePath(pathname: string): string {
    return pathname.startsWith("/admin") ? "/admin/test-series" : "/teacher/test-series"
}
