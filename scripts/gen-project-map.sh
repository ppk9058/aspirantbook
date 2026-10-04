#!/usr/bin/env bash
# gen-project-map.sh
# Run from the repo root:  bash scripts/gen-project-map.sh
# Writes docs/PROJECT_MAP.generated.md  (facts only; no secrets, no env VALUES, no source code)
set -u

OUT="docs/PROJECT_MAP.generated.md"
mkdir -p docs

# Support both "app/" and "src/app/" layouts
BASE="."
[ -d src ] && BASE="src"
APP="$BASE/app"; [ -d "$APP" ] || APP="app"
COMP="$BASE/components"; [ -d "$COMP" ] || COMP="components"
LIB="$BASE/lib"; [ -d "$LIB" ] || LIB="lib"

exists() { [ -e "$1" ]; }

{
echo "# Generated project map"
echo "Generated on $(date +%F). Facts extracted by script. Re-run after structural changes."
echo

echo "## 1. package.json (name, scripts, dependencies)"
if exists package.json && command -v node >/dev/null 2>&1; then
  node -e '
    const p=require("./package.json");
    console.log("name:", p.name);
    console.log("scripts:", JSON.stringify(p.scripts||{}, null, 1));
    console.log("dependencies:", Object.keys(p.dependencies||{}).join(", "));
    console.log("devDependencies:", Object.keys(p.devDependencies||{}).join(", "));
  '
else
  echo "(package.json or node not found)"
fi
echo

echo "## 2. Top-level files and folders"
ls -1 | grep -vE '^(node_modules|\.next|\.git)$'
echo

echo "## 3. Routes (pages, layouts, route handlers, loading/error)"
if exists "$APP"; then
  find "$APP" -type f \( -name "page.tsx" -o -name "page.ts" -o -name "layout.tsx" -o -name "route.ts" -o -name "route.tsx" -o -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx" \) | sort
else
  echo "(app directory not found)"
fi
echo

echo "## 4. Components (by folder)"
if exists "$COMP"; then
  find "$COMP" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | sort
else
  echo "(components directory not found)"
fi
echo

echo "## 5. lib/ files"
if exists "$LIB"; then find "$LIB" -type f | sort; else echo "(lib not found)"; fi
echo

echo "## 6. Prisma models (name: fields) and enums"
if exists prisma/schema.prisma; then
  awk '
    /^model /{m=$2; printf "\n%s: ", m; next}
    /^enum /{m=""; e=$2; printf "\n[enum] %s: ", e; inenum=1; next}
    /^}/{inenum=0; m=""; next}
    inenum && /^  [A-Za-z_]/{printf "%s ", $1; next}
    m!="" && /^  [a-z]/{printf "%s ", $1}
  ' prisma/schema.prisma
  echo
else
  echo "(prisma/schema.prisma not found)"
fi
echo

echo "## 7. Files using server actions (\"use server\")"
grep -rl '"use server"' "$APP" "$LIB" "$COMP" --include=*.ts --include=*.tsx 2>/dev/null | sort
echo

echo "## 8. Client components count vs total tsx"
CC=$(grep -rl '"use client"' "$APP" "$COMP" --include=*.tsx 2>/dev/null | wc -l | tr -d ' ')
TT=$(find "$APP" "$COMP" -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "client components: $CC of $TT tsx files"
echo

echo "## 9. Environment variable NAMES referenced in code (values are NOT included)"
grep -rhoE "process\.env\.[A-Z0-9_]+" "$APP" "$LIB" "$COMP" --include=*.ts --include=*.tsx 2>/dev/null | sort -u
echo

echo "## 10. Auth, middleware and config files"
ls -1 middleware.* auth.* next.config.* tailwind.config.* postcss.config.* tsconfig.json playwright.config.* vitest.config.* jest.config.* .eslintrc* eslint.config.* 2>/dev/null
echo

echo "## 11. Feature flags (NEXT_PUBLIC_ names)"
grep -rhoE "NEXT_PUBLIC_[A-Z0-9_]+" "$APP" "$LIB" "$COMP" --include=*.ts --include=*.tsx 2>/dev/null | sort -u
echo

echo "## 12. Data files and scripts"
ls -1 data 2>/dev/null | sed 's/^/data\//'
ls -1 scripts 2>/dev/null | sed 's/^/scripts\//'
echo

echo "## 13. Largest source files (lines)"
find "$APP" "$COMP" "$LIB" \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + 2>/dev/null | grep -v " total$" | sort -rn | head -25
echo

echo "## 14. Hardcoded hex colours per file (top 15)"
grep -rcE "#[0-9a-fA-F]{6}\b" "$APP" "$COMP" --include=*.tsx 2>/dev/null | grep -v ":0$" | sort -t: -k2 -rn | head -15
echo

echo "## 15. TODO / FIXME locations (first 40)"
grep -rnE "TODO|FIXME" "$APP" "$COMP" "$LIB" --include=*.ts --include=*.tsx 2>/dev/null | cut -c1-160 | head -40
echo

echo "## 16. Tests"
find . -path ./node_modules -prune -o -path ./.next -prune -o \( -name "*.spec.*" -o -name "*.test.*" \) -print 2>/dev/null | head -50
echo

echo "## 17. Git (recent branches and last 15 commits)"
git branch --sort=-committerdate 2>/dev/null | head -10
git log --oneline -15 2>/dev/null
} > "$OUT"

echo "Wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes, $(wc -l < "$OUT" | tr -d ' ') lines)"
