/**
 * Next.js instrumentation hook.
 *
 * `register()` runs once per server process at start-up (Node and Edge
 * runtimes), before the first request and independently of whether any page
 * renders. Security configuration is validated here so a misconfigured
 * deployment refuses to serve traffic at all.
 */
import { validateBootSecurity } from "./lib/boot-guard";

export async function register() {
  validateBootSecurity();
}
