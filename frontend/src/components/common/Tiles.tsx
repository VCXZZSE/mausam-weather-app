// Shared tile primitives.
//
// These were local to App.tsx until the homepage became persona-driven: the
// persona sections in components/home render the same cards, badges and meters
// the built-in tiles do, and importing them back out of App.tsx would have made
// a module cycle. Nothing here knows about weather — they are layout only.

import { Icon } from "@/components/icons/Icon"
import { resolveIconName, type IconName } from "@/components/icons/iconMap"
import type { ReactNode } from "react"

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="section-label"
      style={{
        fontSize: 10,
        fontWeight: 800,
        color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

export function Card({
  grad,
  border,
  children,
  span2,
  pad = 16,
  className,
}: {
  grad: string
  border?: string
  children: ReactNode
  span2?: boolean
  pad?: number
  className?: string
}) {
  // A full-width tile is marked in the class list as well as by the inline
  // grid-column, because the stylesheet sizes metric tiles with a 1/1
  // aspect-ratio — square at one column, absurdly tall across two. CSS needs a
  // selector to turn that off, and an inline style is not one.
  return (
    <div
      className={`futuristic-card interactive-tile${span2 ? " metric-tile-wide" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={{
        background: grad,
        border: `1px solid ${border ?? "rgba(255,255,255,0.05)"}`,
        borderRadius: 20,
        padding: pad,
        overflow: "hidden",
        position: "relative",
        gridColumn: span2 ? "1 / -1" : undefined,
      }}
    >
      {children}
    </div>
  )
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="card-label"
      style={{
        fontSize: 9,
        fontWeight: 800,
        color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  color,
  bg,
  className,
}: {
  children: ReactNode
  color: string
  bg: string
  className?: string
}) {
  return (
    <span
      className={`badge metric-tile-badge${className ? ` ${className}` : ""}`}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        // The badge is out of flow, so nothing stops a long reading - a
        // translated "VERY HIGH", a four-digit AQI - from growing leftwards
        // past the tile. It stops at the card's own padding instead.
        maxWidth: "calc(100% - 24px)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        padding: "3px 8px",
        fontSize: 8,
        fontWeight: 900,
        color,
        letterSpacing: "0.07em",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {children}
    </span>
  )
}

export function Bar({
  pct,
  fill,
  height = 4,
}: {
  pct: number
  fill: string
  height?: number
}) {
  return (
    <div
      style={{
        height,
        background: "rgba(255,255,255,0.08)",
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: fill,
          borderRadius: height / 2,
        }}
      />
    </div>
  )
}

// The scale itself is defined once in index.css as --aqi-* custom properties,
// so the meter and the band icons cannot drift apart.
export const INDIA_NAQI_GRADIENT = "var(--aqi-gradient)"

/**
 * Renders an icon named by the API payload. Unlike a literal <Icon name="..." />
 * the value is not known at build time: a cached response or an older backend
 * may still carry an emoji, which resolveIconName maps to its replacement.
 * Anything it cannot place renders nothing rather than a broken glyph.
 */
export function IconByName({ name, label }: { name: string; label?: string }) {
  const resolved = resolveIconName(name)
  if (!resolved) return null
  return <Icon name={resolved} label={label} />
}

/**
 * A line of advice with the icon that leads it. The icon used to be an emoji
 * glued to the front of the sentence, which meant every hi/bn translation had
 * to carry its own copy and the i18n layer had to strip it back off before it
 * could match a key. `tone` is optional, so a payload from before the change
 * still renders — just without the mark.
 */
export const ADVICE_EMOJIS: Array<[string, IconName]> = [
  ["☂️", "umbrella"],
  ["☂", "umbrella"],
  ["😎", "sunglasses"],
  ["🕶️", "sunglasses"],
  ["🕶", "sunglasses"],
  ["🧴", "sunscreen"],
  ["🌿", "pollen"],
  ["🌱", "sprout"],
  ["🌾", "wheat"],
  ["💧", "hydration"],
  ["😷", "mask"],
  ["🤧", "pollen"],
  ["💡", "tip"],
  ["⚠️", "warning"],
  ["⚠", "warning"],
  ["🚨", "alert"],
  ["✅", "success"],
  ["🚫", "blocked"],
  ["⚡️", "bolt"],
  ["⚡", "bolt"],
  ["🐟", "fish"],
]

export function parseAdviceSegment(
  segment: string,
  fallbackTone?: string,
): { icon: IconName | null; text: string } {
  let cleaned = segment.trim()
  let matchedIcon: IconName | null = null

  for (const [emoji, iconName] of ADVICE_EMOJIS) {
    if (cleaned.includes(emoji)) {
      matchedIcon = matchedIcon ?? iconName
      cleaned = cleaned.split(emoji).join("").trim()
    }
  }

  if (!matchedIcon) {
    if (/umbrella|छाता|ছাতা/i.test(cleaned)) matchedIcon = "umbrella"
    else if (/sunglasses|चश्मा|রোদচশমা/i.test(cleaned)) matchedIcon = "sunglasses"
    else if (/spf|sunscreen|सनस्क्रीन/i.test(cleaned)) matchedIcon = "sunscreen"
    else if (/drink|water|hydrat|पानी|जल|ors/i.test(cleaned)) matchedIcon = "hydration"
    else if (/pollen|allergy|antihistamine|पराग/i.test(cleaned)) matchedIcon = "pollen"
    else if (/exertion|strenuous|heat|मेहनत|गर्मी|পরিশ্রম|গরম/i.test(cleaned)) matchedIcon = "hot"
    else if (/mask|मास्क/i.test(cleaned)) matchedIcon = "mask"
    else if (/window|खिड़की|জানালা/i.test(cleaned)) matchedIcon = "home"
    else if (fallbackTone) matchedIcon = resolveIconName(fallbackTone)
  }

  return { icon: matchedIcon, text: cleaned }
}

export function AdviceLine({ text, tone }: { text: string; tone?: string }) {
  if (!text) return null
  const segments = text.split(/\s*·\s*/).filter(Boolean)

  if (segments.length <= 1) {
    const item = parseAdviceSegment(text, tone)
    return (
      <span className="advice-line-single">
        {item.icon && <Icon name={item.icon} className="advice-tone" />}
        <span>{item.text}</span>
      </span>
    )
  }

  const items = segments.map((seg, i) =>
    parseAdviceSegment(seg, i === 0 ? tone : undefined),
  )

  return (
    <span className="advice-items-wrap">
      {items.map((item, idx) => (
        <span key={idx} className="advice-chip">
          {item.icon && <Icon name={item.icon} className="advice-tone" />}
          <span>{item.text}</span>
        </span>
      ))}
    </span>
  )
}
