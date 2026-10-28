/**
 * A2: the test-instructions screen shows an upgrade CTA only when start was
 * denied and the test is premium. Free tests never show it (nothing to buy).
 */
export function shouldShowUpgradeCta(isFree: boolean, startError: string | null): boolean {
  return Boolean(startError && startError.trim().length > 0) && !isFree
}
