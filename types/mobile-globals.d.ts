/**
 * React Native / Expo runtime global.
 *
 * The root TypeScript program type-checks `tests/unit/ratelimit-and-mobile-sync.test.ts`,
 * which imports `apps/mobile/src/lib/cbt-sync.ts`. That module (and its `./api`
 * dependency) uses the React Native `__DEV__` global, which is declared by the
 * Expo config inside `apps/mobile` but not for the root program.
 *
 * This declaration only supplies the type; the web bundle never evaluates the
 * mobile modules.
 */
declare const __DEV__: boolean;
