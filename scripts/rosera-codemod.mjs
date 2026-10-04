import fs from "node:fs"

const file = process.argv[2]
if (!file) {
    console.error("Usage: node rosera-codemod.mjs <file>")
    process.exit(1)
}

const MAP = {
    "#1f2a6b": "ink",
    "#10162f": "ink",
    "#1b254b": "ink",
    "#070a0f": "code",
    "#3b2fd6": "primary",
    "#3a10e5": "primary",
    "#4338ca": "primary",
    "#0e9f78": "green",
    "#059669": "green",
    "#ffe066": "yellow",
    "#fef08a": "yellow",
    "#fdf099": "yellow",
    "#d3e3ff": "soft",
    "#ddebfe": "soft",
    "#f5f9ff": "card",
    "#fffdf9": "card",
    "#26338a": "code",
    "#dcd8ff": "lav",
}

const unknown = new Set()
const v = (h) => {
    const k = MAP[h.toLowerCase()]
    if (!k) {
        unknown.add(h)
        return null
    }
    return `var(--rz-${k})`
}

let s = fs.readFileSync(file, "utf8")

// Tailwind arbitrary color classes like bg-[#1f2a6b] -> bg-[color:var(--rz-ink)]
s = s.replace(
    /\b(bg|text|border|ring|fill|stroke|accent|from|to|via|outline)-\[(#[0-9a-fA-F]{6})\](?!\/)/g,
    (m, p, h) => {
        const r = v(h)
        return r ? `${p}-[color:${r}]` : m
    }
)

// Tailwind shadow classes with hex like shadow-[3px_3px_0px_#1f2a6b]
s = s.replace(/(shadow-\[[^\]]*?)(#[0-9a-fA-F]{6})(\])/g, (m, a, h, c) => {
    const r = v(h)
    return r ? a + r + c : m
})

// Standalone JS/TS string literals like "#1f2a6b"
s = s.replace(/(["'])(#[0-9a-fA-F]{6})\1/g, (m, q, h) => {
    const r = v(h)
    return r ? `${q}${r}${q}` : m
})

// Replace text-black
s = s.replace(/\btext-black\b/g, "text-[color:var(--rz-ink)]")

// Opacity classes like border-[#1f2a6b]/20 -> border-[color:color-mix(in_srgb,var(--rz-ink)_20%,transparent)]
s = s.replace(
    /\b(bg|text|border|ring|fill|stroke)-\[(#[0-9a-fA-F]{6})\]\/(\d+)\b/g,
    (m, p, h, op) => {
        const k = MAP[h.toLowerCase()]
        if (k) {
            return `${p}-[color:color-mix(in_srgb,var(--rz-${k})_${op}%,transparent)]`
        }
        return m
    }
)

fs.writeFileSync(file, s)
console.log("Unmapped colors remaining:", [...unknown])
