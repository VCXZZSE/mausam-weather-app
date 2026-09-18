/**
 * Fails the build when an import's casing does not match the file on disk.
 *
 * Windows and macOS resolve `./documentPage.css` to a file committed as
 * `DocumentPage.css`, so a mis-cased import builds and tests clean on a
 * contributor's machine. Vercel builds on Linux, where the filesystem is
 * case-sensitive and that same import cannot resolve at all — the deployment
 * fails on a file nobody touched, several commits after the rename that
 * actually broke it. That is exactly how the `frontend/src/documentPage.css`
 * -> `frontend/src/components/common/DocumentPage.css` rename took down every
 * preview build for a day.
 *
 * Paths come from `git ls-files` rather than from a directory walk: git stores
 * the committed spelling, which is what Linux will check out, while a local
 * `readdir` on Windows hands back whatever the case-insensitive filesystem
 * feels like reporting.
 *
 * Only genuine case mismatches are reported — a specifier that resolves to
 * nothing under any casing is left alone, since bare package names, virtual
 * modules and generated files all legitimately look unresolvable from here.
 *
 * Runs in CI and as part of `npm run check:case`.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

// -z keeps non-ASCII filenames intact; git would otherwise escape them.
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)

const committed = new Set(tracked)
const byLowercase = new Map()
for (const file of tracked) byLowercase.set(file.toLowerCase(), file)

const sources = tracked.filter(file => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))

const SPECIFIER = /(?:^|[\s;{}(,])(?:import|export)\s[\s\S]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)|(?:^|[\s;{}])import\s*["']([^"']+)["']/gm

// A specifier may omit the extension, name a directory's index file, or - under
// TypeScript's NodeNext resolution - point at the .js that a .ts will compile to.
const SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".svg",
  ".json",
  ".md",
  "/index.ts",
  "/index.tsx",
  "/index.js",
]

const candidatesFor = target => {
  const stems = [target]
  if (target.endsWith(".js")) stems.push(target.slice(0, -3))
  return stems.flatMap(stem => SUFFIXES.map(suffix => stem + suffix))
}

const mismatches = []

for (const source of sources) {
  const text = readFileSync(source, "utf8")

  for (const match of text.matchAll(SPECIFIER)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? match[4]
    if (!raw) continue

    // Vite carries build instructions in a query: `./icon.svg?raw`.
    const specifier = raw.split("?")[0]

    let target
    if (specifier.startsWith(".")) {
      target = path.posix.join(path.posix.dirname(source), specifier)
    } else if (specifier.startsWith("@/")) {
      target = path.posix.join("frontend/src", specifier.slice(2))
    } else {
      continue // a package name, not a path we own
    }

    const candidates = candidatesFor(target)
    if (candidates.some(candidate => committed.has(candidate))) continue

    const onlyDifferentCase = candidates
      .map(candidate => candidate.toLowerCase())
      .find(candidate => byLowercase.has(candidate))

    if (onlyDifferentCase) {
      mismatches.push({ source, specifier, committed: byLowercase.get(onlyDifferentCase) })
    }
  }
}

if (mismatches.length === 0) {
  console.log(`[import-case] ${sources.length} files checked, no case mismatches.`)
  process.exit(0)
}

console.error(
  `\n[import-case] ${mismatches.length} import(s) will not resolve on a case-sensitive filesystem:\n`,
)
for (const { source, specifier, committed: actual } of mismatches) {
  console.error(`  ${source}`)
  console.error(`    imports:   ${specifier}`)
  console.error(`    committed: ${actual}\n`)
}
console.error("Fix the import, or rename the file so the two agree.\n")
process.exit(1)
