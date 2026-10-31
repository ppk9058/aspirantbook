/**
 * React Native / Expo declarations for the root TypeScript program.
 *
 * The root program type-checks `tests/unit/ratelimit-and-mobile-sync.test.ts`,
 * which imports `apps/mobile/src/lib/cbt-sync.ts` -> `./api` -> `./storage`.
 * Those modules rely on Expo globals and native packages that are installed
 * only inside `apps/mobile`, not in the web root install.
 *
 * Nothing here ships to the browser: the web bundle never imports the mobile
 * modules. The mobile app has its own tsconfig and type-checks against the real
 * packages, so these declarations cannot hide a type error in mobile code.
 */

/** React Native / Expo dev-mode global. */
declare const __DEV__: boolean;

/**
 * `expo-secure-store` surface used by `apps/mobile/src/lib/storage.ts`.
 * Declared because the package is not part of the root dependency tree.
 */
declare module "expo-secure-store" {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}
