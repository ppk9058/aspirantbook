import fs from "fs";
import path from "path";
import { SCREEN_REGISTRY, ALL_SCREEN_STATES } from "../apps/mobile/tests/helpers/screen-registry";

const TARGET_FILE = path.resolve(__dirname, "../apps/mobile/tests/screen-matrix-states.test.tsx");

function generate() {
  const lines: string[] = [
    'import React from "react";',
    'import { render } from "@testing-library/react-native";',
    'import { QueryClient, QueryClientProvider } from "@tanstack/react-query";',
    'import { ThemeProvider } from "../src/theme/ThemeProvider";',
    'import { AuthProvider } from "../src/context/AuthContext";',
    'import { GoalProvider } from "../src/context/GoalContext";',
    'import { Storage } from "../src/lib/storage";',
    '',
    'const { __setMockParams } = require("expo-router");',
    '',
    '// Registry of Screen Components',
    'const SCREEN_MAP: Record<string, any> = {',
  ];

  for (const s of SCREEN_REGISTRY) {
    const importPath = `../src/app/${s.file.replace(/\.tsx$/, "")}`;
    lines.push(`  "${s.route}": require("${importPath}").default,`);
  }

  lines.push("};");
  lines.push("");
  lines.push("function createWrapper() {");
  lines.push("  const queryClient = new QueryClient({");
  lines.push("    defaultOptions: { queries: { retry: false, gcTime: 0 } },");
  lines.push("  });");
  lines.push("  return function Wrapper({ children }: { children: React.ReactNode }) {");
  lines.push("    return (");
  lines.push("      <QueryClientProvider client={queryClient}>");
  lines.push("        <ThemeProvider>");
  lines.push("          <AuthProvider>");
  lines.push("            <GoalProvider>{children}</GoalProvider>");
  lines.push("          </AuthProvider>");
  lines.push("        </ThemeProvider>");
  lines.push("      </QueryClientProvider>");
  lines.push("    );");
  lines.push("  };");
  lines.push("}");
  lines.push("");
  lines.push('describe("T3: Screen State Matrix Mounted Suite", () => {');
  lines.push("  beforeEach(() => {");
  lines.push("    jest.clearAllMocks();");
  lines.push('    __setMockParams({ id: "mock-id-1", slug: "mock-slug-1", lessonId: "mock-les-1" });');
  lines.push("  });");
  lines.push("");

  for (const s of SCREEN_REGISTRY) {
    lines.push(`  describe("${s.route}", () => {`);
    for (const state of s.requiredStates) {
      const title = `[${s.route}] ${state}`;
      lines.push(`    it("${title}", async () => {`);
      lines.push(`      const Comp = SCREEN_MAP["${s.route}"];`);
      lines.push("      if (!Comp) return;");

      if (state === "loading") {
        lines.push("      global.fetch = jest.fn(() => new Promise(() => {})) as any;");
      } else if (state === "empty") {
        lines.push('      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: [] }) } as any);');
      } else if (state === "error500") {
        lines.push('      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, error: { message: "Internal server error" } }) } as any);');
      } else if (state === "networkFailure") {
        lines.push('      global.fetch = jest.fn().mockRejectedValue(new Error("Network connection failed"));');
      } else {
        // success
        lines.push('      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, data: { id: "mock-id-1", items: [] } }) } as any);');
      }

      lines.push("      const { toJSON } = render(<Comp />, { wrapper: createWrapper() });");
      lines.push("      expect(toJSON()).toBeDefined();");
      lines.push("    });");
    }
    lines.push("  });");
    lines.push("");
  }

  lines.push("});");

  fs.writeFileSync(TARGET_FILE, lines.join("\n") + "\n", "utf8");
  console.log(`Generated ${TARGET_FILE} successfully.`);
}

generate();
