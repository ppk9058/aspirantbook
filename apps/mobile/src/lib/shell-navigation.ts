/**
 * Shell Navigation Logic & Route Invariants
 * Pure helper functions for route active states, bottom bar visibility, and navigation descriptors.
 */

export function isBottomBarHidden(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // Hidden on full-screen test attempts and video lessons
  // Web source: components/layout/MobileNativeBottomBar.tsx:21-34
  return Boolean(
    pathname.includes("/attempt") ||
    pathname.includes("/take") ||
    pathname.includes("/test-execution") ||
    pathname.includes("/runner") ||
    pathname.includes("/learn/") ||
    pathname.includes("/lesson/") ||
    pathname.endsWith("/lesson")
  );
}

export function isTabActive(
  tabName: "home" | "tests" | "courses" | "pass",
  pathname: string | null | undefined
): boolean {
  if (!pathname) return false;

  switch (tabName) {
    case "home":
      return Boolean(
        pathname === "/" ||
        pathname === "/dashboard" ||
        pathname === "/(tabs)/home" ||
        pathname === "/home"
      );
    case "tests":
      return Boolean(
        pathname.startsWith("/tests") ||
        pathname.startsWith("/test-series") ||
        pathname.startsWith("/my-tests") ||
        pathname.startsWith("/assessments") ||
        pathname.startsWith("/pyqs") ||
        pathname.startsWith("/current-affairs") ||
        pathname === "/(tabs)/tests"
      );
    case "courses":
      return Boolean(
        (pathname.startsWith("/courses") && pathname !== "/" && pathname !== "/dashboard") ||
        pathname.startsWith("/tutorials") ||
        pathname.startsWith("/tracks") ||
        pathname.startsWith("/batches") ||
        pathname.startsWith("/my-learning") ||
        pathname === "/(tabs)/courses"
      );
    case "pass":
      return Boolean(
        pathname.startsWith("/subscription") ||
        pathname.startsWith("/pricing") ||
        pathname.startsWith("/checkout") ||
        pathname.startsWith("/pass") ||
        pathname === "/(tabs)/pass"
      );
    default:
      return false;
  }
}
