// Vendors the weather icons this app renders into frontend/src/assets/icons/weather/.
//
// They are copied in rather than loaded from a CDN because the app ships inside
// a Capacitor Android WebView that has to work with no network at all.
//
// Source: @bybas/weather-icons (Meteocons by Bas Milius), MIT. We take
// `design/fill/export/` — the pre-animation artwork — because the published
// `production/fill/` SVGs carry <animateTransform> and this app wants a static
// icon set.
//
// The upstream files all name their gradients `a`, `b`, `c`..., so inlining two
// of them into one document makes the second icon pick up the first one's
// gradients. Every id is therefore rewritten to `<icon-name>-<id>` here, along
// with the url(#...) and href="#..." references to it.
//
// Run with: node scripts/vendor-weather-icons.mjs

import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = join(ROOT, "node_modules", "@bybas", "weather-icons", "design", "fill", "export")
const DEST = join(ROOT, "frontend", "src", "assets", "icons", "weather")

/**
 * Only the icons the app can actually render, keyed by the name used in
 * iconMap.ts. Keeping this list tight keeps the bundle small — the upstream set
 * has 122 icons and we need 14.
 */
const ICONS = [
  "clear-day",
  "clear-night",
  "partly-cloudy-day",
  "partly-cloudy-night",
  "overcast",
  "overcast-night",
  "drizzle",
  "rain",
  "thunderstorms-rain",
  "fog-day",
  "fog-night",
  "wind",
  "snow",
  "thermometer",
]

function namespaceIds(svg, prefix) {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
  let out = svg
  for (const id of ids) {
    const next = `${prefix}-${id}`
    // Escape the id for use in a RegExp: upstream ids are short and
    // alphanumeric, but do not assume it.
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    out = out
      .replace(new RegExp(`\\bid="${safe}"`, "g"), `id="${next}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, "g"), `url(#${next})`)
      .replace(new RegExp(`(xlink:)?href="#${safe}"`, "g"), (m, xl) => `${xl ?? ""}href="#${next}"`)
  }
  return out
}

rmSync(DEST, { recursive: true, force: true })
mkdirSync(DEST, { recursive: true })

let total = 0
for (const name of ICONS) {
  const source = join(SOURCE, `wi_${name}.svg`)
  let svg = readFileSync(source, "utf8")

  if (/<animate/i.test(svg)) {
    throw new Error(`${name}: expected static artwork but found an animation tag`)
  }

  svg = namespaceIds(svg, name)
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .trim()

  writeFileSync(join(DEST, `${name}.svg`), svg + "\n", "utf8")
  total += svg.length
  console.log(`  ${name}.svg  ${svg.length} bytes`)
}

console.log(`\nvendored ${ICONS.length} icons, ${(total / 1024).toFixed(1)} kB total, into`)
console.log(`  ${DEST.replace(ROOT, ".")}`)
