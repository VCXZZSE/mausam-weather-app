import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Icon } from "@/components/icons/Icon"
import {
  ICON_SPECS,
  LEGACY_EMOJI_ALIASES,
  isIconName,
  resolveIconName,
  type IconName,
} from "@/components/icons/iconMap"

afterEach(cleanup)

describe("Icon", () => {
  it("renders every name in the union", () => {
    for (const name of Object.keys(ICON_SPECS) as IconName[]) {
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
    expect(resolveIconName("☀️")).toBe("sun")
    expect(resolveIconName("🥶")).toBe("cold")
    expect(resolveIconName("🌧️")).toBe("rain")
    expect(resolveIconName("🙂")).toBe("comfort")
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
      expect(ICON_SPECS[name]).toBeDefined()
    }
  })

  it("renders an aliased emoji as the replacement icon", () => {
    const name = resolveIconName("🌡️")!
    const { container } = render(<Icon name={name} label="Temperature" />)
    expect(container.querySelector("svg")).not.toBeNull()
    expect(screen.getByRole("img", { name: "Temperature" })).toBeTruthy()
  })
})
