import { sanitizeReturnPath } from "../lib/utils/return-path";

const testCases: Array<{ input: string | null | undefined; expected: string; label: string }> = [
  // Valid relative paths
  { input: "/pyqs/bpsc", expected: "/pyqs/bpsc", label: "Valid relative PYQ path" },
  { input: "/test-series/upsc-2027", expected: "/test-series/upsc-2027", label: "Valid test series path" },
  { input: "/dashboard?tab=tests", expected: "/dashboard?tab=tests", label: "Valid relative path with query" },
  { input: "/my-tests", expected: "/my-tests", label: "Valid my-tests path" },

  // Dangerous protocol-relative URLs
  { input: "//evil.com", expected: "/test-series", label: "Protocol-relative double slash" },
  { input: "//evil.com/phish", expected: "/test-series", label: "Protocol-relative path" },
  { input: "/\\evil.com", expected: "/test-series", label: "Mixed slash backslash" },

  // Dangerous absolute URLs
  { input: "https://evil.com", expected: "/test-series", label: "Absolute HTTPS URL" },
  { input: "http://evil.com", expected: "/test-series", label: "Absolute HTTP URL" },
  { input: "https://evil.com/fake-login", expected: "/test-series", label: "Absolute HTTPS with path" },

  // Dangerous schemes
  { input: "javascript:alert(1)", expected: "/test-series", label: "Javascript scheme" },
  { input: "/redirect?url=javascript:alert(1)", expected: "/test-series", label: "Embedded javascript scheme" },
  { input: "data:text/html,<script>alert(1)</script>", expected: "/test-series", label: "Data scheme" },

  // Windows backslash traversal
  { input: "\\evil.com", expected: "/test-series", label: "Leading backslash" },
  { input: "/path\\with\\backslashes", expected: "/test-series", label: "Path containing backslashes" },

  // Encoded bypass attempts
  { input: "/%2f%2fevil.com", expected: "/test-series", label: "Encoded double slash" },
  { input: "/%5cevil.com", expected: "/test-series", label: "Encoded backslash" },
  { input: "/https%3a%2f%2fevil.com", expected: "/test-series", label: "Encoded https scheme" },

  // Empty or invalid types
  { input: null, expected: "/test-series", label: "Null input" },
  { input: undefined, expected: "/test-series", label: "Undefined input" },
  { input: "", expected: "/test-series", label: "Empty string" },
];

let failed = 0;
console.log("=== Testing sanitizeReturnPath Security & Validation ===");
for (const tc of testCases) {
  const result = sanitizeReturnPath(tc.input);
  if (result === tc.expected) {
    console.log(`✓ PASS: ${tc.label} -> "${result}"`);
  } else {
    console.error(`✗ FAIL: ${tc.label} -> Got "${result}", expected "${tc.expected}"`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\nFAILED ${failed} tests!`);
  process.exit(1);
} else {
  console.log(`\nALL ${testCases.length} returnPath security unit tests PASSED!`);
}
