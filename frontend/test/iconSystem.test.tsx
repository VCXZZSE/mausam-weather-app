import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Icon } from "@/components/icons/Icon"
import {
  AQI_BANDS,
  ICON_SPECS,
  LEGACY_EMOJI_ALIASES,
  LUCIDE_ICONS,
  SVG_ASSETS,
  aqiBandForIndex,
  aqiBandForLabel,
  isIconName,
  isLucideIcon,
  isSvgAssetIcon,
  resolveIconName,
  weatherIconForCondition,
  type IconName,
} from "@/components/icons/iconMap"

afterEach(cleanup)

describe("Icon", () => {
  it("renders every name in the union", () => {
    const names: IconName[] = [
      ...(Object.keys(ICON_SPECS) as IconName[]),
      ...(Object.keys(SVG_ASSETS) as IconName[]),
      ...(Object.keys(LUCIDE_ICONS) as IconName[]),
    ]
    for (const name of names) {
      const { container, unmount } = render(<Icon name={name} />)
      const svg = container.querySelector("svg")
      expect(svg, `${name} rendered nothing`).not.toBeNull()
      expect(
        svg!.querySelectorAll("path, circle").length,
        `${name} has no art`,
      ).toBeGreaterThan(0)
      unmount()
    }
  })

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<Icon name="spark" />)
    const svg = container.querySelector("svg")!
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.getAttribute("role")).toBeNull()
  })

  it("exposes an accessible name when one is given", () => {
    render(<Icon name="shield" label="Protected" />)
    const svg = screen.getByRole("img", { name: "Protected" })
    expect(svg.getAttribute("aria-hidden")).toBeNull()
  })

  it("leaves sizing to CSS unless a size is passed", () => {
    const { container: auto } = render(<Icon name="close" />)
    expect(auto.querySelector("svg")!.hasAttribute("width")).toBe(false)

    const { container: fixed } = render(<Icon name="close" size={20} />)
    expect(fixed.querySelector("svg")!.getAttribute("width")).toBe("20")
  })

  it("keeps each icon's original stroke weight, and allows an override", () => {
    // The three components this replaced drew at 1.6, 2 and 1.8.
    const { container: sidebar } = render(<Icon name="close" />)
    expect(sidebar.querySelector("svg")!.getAttribute("stroke-width")).toBe("1.6")

    const { container: faq } = render(<Icon name="copy" />)
    expect(faq.querySelector("svg")!.getAttribute("stroke-width")).toBe("2")

    const { container: briefing } = render(<Icon name="sun" />)
    expect(briefing.querySelector("svg")!.getAttribute("stroke-width")).toBe("1.8")

    // FAQPage draws `close` heavier than the sidebar does.
    const { container: override } = render(<Icon name="close" strokeWidth={2} />)
    expect(override.querySelector("svg")!.getAttribute("stroke-width")).toBe("2")
  })

  it("inherits colour so theme rules drive it", () => {
    const { container } = render(<Icon name="sun" />)
    expect(container.querySelector("svg")!.getAttribute("stroke")).toBe(
      "currentColor",
    )
  })
})

describe("resolveIconName", () => {
  it("passes current names through", () => {
    expect(resolveIconName("shield")).toBe("shield")
    expect(resolveIconName("  wind  ")).toBe("wind")
  })

  // A frozen Android bundle can hold an old emoji `icon` value while the
  // backend has already moved to names, and a current bundle can read a cached
  // payload written by an older backend. Both must degrade, not break.
  it("resolves legacy emoji from a stale payload to the icon that replaced it", () => {
    expect(resolveIconName("☀️")).toBe("clear-day")
    expect(resolveIconName("🌙")).toBe("clear-night")
    expect(resolveIconName("🌧️")).toBe("rain-cloud")
    expect(resolveIconName("⛈️")).toBe("thunderstorms-rain")
    expect(resolveIconName("🥶")).toBe("cold")
    // the two-glyph night-cloud hack the old resolver emitted
    expect(resolveIconName("🌙☁️")).toBe("overcast-night")
    // CPCB band faces
    expect(resolveIconName("😊")).toBe("aqi-good")
    expect(resolveIconName("☠️")).toBe("aqi-severe")
  })

  it("returns null for anything unrecognised, so callers can fall back", () => {
    expect(resolveIconName("not-an-icon")).toBeNull()
    expect(resolveIconName("🦖")).toBeNull()
    expect(resolveIconName("")).toBeNull()
    expect(resolveIconName(undefined)).toBeNull()
    expect(resolveIconName(null)).toBeNull()
  })

  it("every alias points at art that exists", () => {
    for (const [emoji, name] of Object.entries(LEGACY_EMOJI_ALIASES)) {
      expect(isIconName(name), `${emoji} -> ${name} is not a real icon`).toBe(true)
      expect(
        isSvgAssetIcon(name)
          ? SVG_ASSETS[name]
          : isLucideIcon(name)
            ? LUCIDE_ICONS[name]
            : ICON_SPECS[name],
      ).toBeDefined()
    }
  })

  it("renders an aliased emoji as the replacement icon", () => {
    const name = resolveIconName("🌡️")!
    const { container } = render(<Icon name={name} label="Temperature" />)
    expect(container.querySelector("svg")).not.toBeNull()
    expect(screen.getByRole("img", { name: "Temperature" })).toBeTruthy()
  })
})

describe("weatherIconForCondition", () => {
  // Every conditionCode backend/src/normalizers/conditionCode.ts can emit.
  const CODES = [
    "clear", "fair", "partly_cloudy", "overcast", "cloudy", "fog", "mist",
    "drizzle", "rain", "heavy_rain", "showers", "snow", "thunderstorm",
    "storm", "sunny", "wind",
  ]

  it("maps every condition code the rules engine emits", () => {
    for (const code of CODES) {
      const icon = weatherIconForCondition(code, true)
      expect(SVG_ASSETS[icon], `${code} has no artwork`).toBeDefined()
    }
  })

  it("is keyed on the code, not on casing or separator style", () => {
    expect(weatherIconForCondition("PARTLY-CLOUDY", true)).toBe("partly-cloudy-day")
    expect(weatherIconForCondition("  partly cloudy  ", true)).toBe(
      "partly-cloudy-day",
    )
  })

  it("only swaps to night artwork for conditions that read differently after dark", () => {
    expect(weatherIconForCondition("clear", false)).toBe("clear-night")
    expect(weatherIconForCondition("overcast", false)).toBe("overcast-night")
    // rain and storms look the same at any hour
    expect(weatherIconForCondition("rain", false)).toBe("rain-cloud")
    expect(weatherIconForCondition("thunderstorm", false)).toBe("thunderstorms-rain")
  })

  it("falls back to the thermometer rather than rendering nothing", () => {
    expect(weatherIconForCondition("volcano", true)).toBe("thermometer")
  })
})

describe("CPCB AQI bands", () => {
  it("picks the band at each boundary", () => {
    expect(aqiBandForIndex(0).icon).toBe("aqi-good")
    expect(aqiBandForIndex(50).icon).toBe("aqi-good")
    expect(aqiBandForIndex(51).icon).toBe("aqi-satisfactory")
    expect(aqiBandForIndex(100).icon).toBe("aqi-satisfactory")
    expect(aqiBandForIndex(101).icon).toBe("aqi-moderate")
    expect(aqiBandForIndex(200).icon).toBe("aqi-moderate")
    expect(aqiBandForIndex(201).icon).toBe("aqi-poor")
    expect(aqiBandForIndex(300).icon).toBe("aqi-poor")
    expect(aqiBandForIndex(301).icon).toBe("aqi-very-poor")
    expect(aqiBandForIndex(400).icon).toBe("aqi-very-poor")
    expect(aqiBandForIndex(401).icon).toBe("aqi-severe")
    expect(aqiBandForIndex(9999).icon).toBe("aqi-severe")
  })

  it("resolves a band from its English label", () => {
    expect(aqiBandForLabel("Very Poor")?.icon).toBe("aqi-very-poor")
    expect(aqiBandForLabel("good")?.icon).toBe("aqi-good")
    expect(aqiBandForLabel("Unlisted")).toBeNull()
  })

  // The scale must survive greyscale printing and colour-blind viewing, so
  // colour cannot be the only thing separating two bands.
  it("gives each band a distinct shape, not just a distinct colour", () => {
    const shapes = AQI_BANDS.map((band) => {
      const markup = SVG_ASSETS[band.icon]
      return [...markup.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join("|")
    })
    expect(new Set(shapes).size).toBe(AQI_BANDS.length)
  })

  it("draws the bands in currentColor so the theme token supplies the colour", () => {
    for (const band of AQI_BANDS) {
      const markup = SVG_ASSETS[band.icon]
      expect(markup).toContain('stroke="currentColor"')
      // no baked-in hex or named fills that would defeat the token
      expect(markup).not.toMatch(/#[0-9a-f]{3,8}/i)
    }
  })

  it("names a CSS custom property for every band", () => {
    for (const band of AQI_BANDS) {
      expect(band.token).toMatch(/^--aqi-/)
    }
  })
})

describe("vendored weather artwork", () => {
  it("is static, with no animation left in it", () => {
    for (const [name, markup] of Object.entries(SVG_ASSETS)) {
      expect(markup, `${name} still animates`).not.toMatch(/<animate/i)
    }
  })

  // Upstream names every gradient `a`, `b`, `c`; inlining two icons into one
  // document would make the second pick up the first one's gradients.
  it("namespaces gradient ids so inlined icons cannot collide", () => {
    const seen = new Map<string, string>()
    for (const [name, markup] of Object.entries(SVG_ASSETS)) {
      for (const match of markup.matchAll(/id="([^"]+)"/g)) {
        const id = match[1]
        expect(
          seen.has(id),
          `id "${id}" is used by both ${seen.get(id)} and ${name}`,
        ).toBe(false)
        seen.set(id, name)
      }
    }
  })
})
