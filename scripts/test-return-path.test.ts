import { sanitizeReturnPath } from "../lib/utils/return-path";

interface TestCase {
  input: string | null | undefined;
  expected: string;
  label: string;
}

const testCases: TestCase[] = [
  // --- Valid App Routes with & without Query Strings ---
  { input: "/pyqs/bpsc", expected: "/pyqs/bpsc", label: "Valid relative PYQ path" },
  { input: "/test-series/upsc-2027", expected: "/test-series/upsc-2027", label: "Valid test series path" },
  { input: "/test-series/upsc-2027/instructions?testId=cmus8baux0007xpvxdb4hga63", expected: "/test-series/upsc-2027/instructions?testId=cmus8baux0007xpvxdb4hga63", label: "Valid instructions route with query" },
  { input: "/test-series/upsc-2027/declaration?testId=cmus8baux0007xpvxdb4hga63", expected: "/test-series/upsc-2027/declaration?testId=cmus8baux0007xpvxdb4hga63", label: "Valid declaration route with query" },
  { input: "/test-series/upsc-2027/attempt?testId=cmus8baux0007xpvxdb4hga63&attemptId=cmutb5tcm0000", expected: "/test-series/upsc-2027/attempt?testId=cmus8baux0007xpvxdb4hga63&attemptId=cmutb5tcm0000", label: "Valid attempt route with query" },
  { input: "/test-series/upsc-2027/result?testId=cmus8baux0007xpvxdb4hga63&attemptId=cmutb5tcm0000", expected: "/test-series/upsc-2027/result?testId=cmus8baux0007xpvxdb4hga63&attemptId=cmutb5tcm0000", label: "Valid result route with query" },
  { input: "/dashboard?tab=tests", expected: "/dashboard?tab=tests", label: "Valid dashboard route with tab" },
  { input: "/my-tests", expected: "/my-tests", label: "Valid my-tests route" },
  { input: "/quizzes", expected: "/quizzes", label: "Valid quizzes route" },
  { input: "/courses/72nd-bpsc-prelims-current-affairs", expected: "/courses/72nd-bpsc-prelims-current-affairs", label: "Valid course route" },
  { input: "/search?q=what+is+https:", expected: "/search?q=what+is+https:", label: "Query containing 'https:' substring" },
  { input: "/search?q=data:structures", expected: "/search?q=data:structures", label: "Query containing 'data:' substring" },
  { input: "/search?q=http://example", expected: "/search?q=http://example", label: "Query containing 'http://example'" },

  // --- Protocol-Relative Delimiters ---
  { input: "//evil.com", expected: "/test-series", label: "Double slash //evil.com" },
  { input: "//evil.com/phish", expected: "/test-series", label: "//evil.com/phish" },
  { input: "///evil.com", expected: "/test-series", label: "Triple slash ///evil.com" },
  { input: "////evil.com", expected: "/test-series", label: "Quad slash ////evil.com" },
  { input: "/\\evil.com", expected: "/test-series", label: "Mixed slash backslash /\\evil.com" },
  { input: "\\evil", expected: "/test-series", label: "Leading backslash \\evil" },
  { input: "\\\\evil.com", expected: "/test-series", label: "Double backslash \\\\evil.com" },

  // --- Absolute URLs with schemes ---
  { input: "https://evil.com", expected: "/test-series", label: "Absolute https://evil.com" },
  { input: "http://evil.com", expected: "/test-series", label: "Absolute http://evil.com" },
  { input: "HTTPS://evil.com", expected: "/test-series", label: "Uppercase HTTPS://evil.com" },
  { input: "Http://evil.com/phish", expected: "/test-series", label: "Mixed case Http://evil.com/phish" },
  { input: "ftp://evil.com", expected: "/test-series", label: "FTP scheme ftp://evil.com" },

  // --- Non-HTTP Schemes ---
  { input: "javascript:alert(1)", expected: "/test-series", label: "javascript:alert(1)" },
  { input: "JAVASCRIPT:alert(1)", expected: "/test-series", label: "Uppercase JAVASCRIPT:alert(1)" },
  { input: "%6Aavascript:alert(1)", expected: "/test-series", label: "Hex encoded %6Aavascript:" },
  { input: "data:text/html,<script>alert(1)</script>", expected: "/test-series", label: "data: scheme" },
  { input: "vbscript:msgbox(1)", expected: "/test-series", label: "vbscript: scheme" },

  // --- Encoded Bypass Vectors ---
  { input: "/%2f/evil.com", expected: "/test-series", label: "Encoded slash /%2f/evil.com" },
  { input: "/%2fevil.com", expected: "/test-series", label: "Encoded slash /%2fevil.com" },
  { input: "/%5cevil.com", expected: "/test-series", label: "Encoded backslash /%5cevil.com" },
  { input: "/%5Cevil.com", expected: "/test-series", label: "Uppercase encoded backslash /%5Cevil.com" },
  { input: "%252f%252fevil.com", expected: "/test-series", label: "Double-encoded slash %252f%252fevil.com" },
  { input: "/%252f%252fevil.com", expected: "/test-series", label: "Slash + double-encoded //" },

  // --- Tab / Newline / Whitespace Injections ---
  { input: "/\t/evil.com", expected: "/test-series", label: "Raw tab character /\\t/evil.com" },
  { input: "/\n/evil.com", expected: "/test-series", label: "Raw newline character /\\n/evil.com" },
  { input: "/\r\n/evil.com", expected: "/test-series", label: "CRLF injection /\\r\\n/evil.com" },
  { input: "/%09/evil.com", expected: "/test-series", label: "Encoded tab /%09/evil.com" },
  { input: "/%0a/evil.com", expected: "/test-series", label: "Encoded newline /%0a/evil.com" },
  { input: "/%0d/evil.com", expected: "/test-series", label: "Encoded CR /%0d/evil.com" },
  { input: "/\0evil.com", expected: "/test-series", label: "Null byte injection /\\0evil.com" },

  // --- @-trick parser differentials ---
  { input: "/@evil.com", expected: "/test-series", label: "Leading @ sign /@evil.com" },
  { input: "/path@evil.com", expected: "/test-series", label: "/path@evil.com" },
  { input: "/%40evil.com", expected: "/test-series", label: "Encoded @ sign /%40evil.com" },

  // --- Path traversal with backslashes ---
  { input: "/path\\with\\backslashes", expected: "/test-series", label: "Internal backslashes /path\\with\\backslashes" },
  { input: "/..\\..\\evil", expected: "/test-series", label: "Directory traversal with backslash" },

  // --- Null / Undefined / Empty ---
  { input: null, expected: "/test-series", label: "null input" },
  { input: undefined, expected: "/test-series", label: "undefined input" },
  { input: "", expected: "/test-series", label: "empty string" },
  { input: "   ", expected: "/test-series", label: "whitespace string" },
];

console.log(`=== Running Extensive returnPath Security Tests (${testCases.length} vectors) ===`);
let passed = 0;
let failed = 0;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const result = sanitizeReturnPath(tc.input);
  if (result === tc.expected) {
    passed++;
    console.log(`[PASS ${i + 1}/${testCases.length}] ${tc.label} -> "${result}"`);
  } else {
    failed++;
    console.error(`[FAIL ${i + 1}/${testCases.length}] ${tc.label} -> Expected "${tc.expected}", got "${result}"`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} vectors.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL VECTORS VERIFIED SUCCESSFULLY!");
}
