import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { LanguageProvider } from "../src/i18n"
import { I18nDebugOverlay } from "../src/i18n/I18nDebugOverlay"
import { setLanguage } from "../src/i18n/languageStore"
import {
  I18N_DEBUG_STORAGE_KEY,
  clearDynamicMisses,
  findUntranslatedText,
  isI18nDebugEnabled,
  setI18nDebugEnabled,
} from "../src/i18n/debug"

function Fixture({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div data-testid="page">{children}</div>
      <I18nDebugOverlay />
    </LanguageProvider>
  )
}

/** The overlay scans on a 150ms debounce behind a MutationObserver. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200))
  })
}

beforeEach(() => {
  localStorage.clear()
  clearDynamicMisses()
  setLanguage("en")
})
afterEach(() => {
  cleanup()
  setI18nDebugEnabled(false)
  setLanguage("en")
  clearDynamicMisses()
})

describe("untranslated-text scanner", () => {
  it("finds nothing while English is active", () => {
    document.body.innerHTML = "<p>Air Quality</p>"
    expect(findUntranslatedText(document.body)).toEqual([])
    document.body.innerHTML = ""
  })

  it("flags English prose in a non-English language", () => {
    setLanguage("hi")
    const host = document.createElement("div")
    host.innerHTML = "<p>वायु गुणवत्ता</p><p>Air Quality</p>"
    expect(findUntranslatedText(host).map((hit) => hit.text)).toEqual([
      "Air Quality",
    ])
  })

  it("does not flag numbers, units, acronyms or identifiers", () => {
    setLanguage("bn")
    const host = document.createElement("div")
    host.innerHTML = [
      "<p>২৯°C</p>",
      "<p>AQI 154</p>",
      "<p>18 km/h</p>",
      "<p>N95 মাস্ক</p>",
      "<p>UV সূচক</p>",
      "<p>৩৪.২ mm</p>",
      "<p>🌧️</p>",
    ].join("")
    expect(findUntranslatedText(host)).toEqual([])
  })

  it("skips subtrees marked data-i18n-ignore", () => {
    setLanguage("hi")
    const host = document.createElement("div")
    host.innerHTML =
      '<p data-i18n-ignore>Kolkata, West Bengal</p><p>Air Quality</p>'
    expect(findUntranslatedText(host).map((hit) => hit.text)).toEqual([
      "Air Quality",
    ])
  })

  it("skips SVG geometry but still checks its accessible text", () => {
    setLanguage("hi")
    const host = document.createElement("div")
    host.innerHTML =
      "<svg><path d=\"M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4z\"></path><title>Sunny weather</title></svg>"
    // Path data is markup; a <title> is the icon's accessible name, so it is
    // held to the same standard as any other visible string.
    expect(findUntranslatedText(host).map((hit) => hit.text)).toEqual([
      "Sunny weather",
    ])
  })
})

describe("debug flag", () => {
  it("is off unless asked for", () => {
    expect(isI18nDebugEnabled()).toBe(false)
  })

  it("persists once set", () => {
    setI18nDebugEnabled(true)
    expect(localStorage.getItem(I18N_DEBUG_STORAGE_KEY)).toBe("1")
    expect(isI18nDebugEnabled()).toBe(true)
  })
})

describe("debug overlay", () => {
  it("renders nothing when the flag is off", () => {
    setLanguage("hi")
    render(<Fixture><p>Air Quality</p></Fixture>)
    expect(screen.queryByLabelText("Translation debug")).not.toBeInTheDocument()
  })

  it("marks untranslated elements and lists them", async () => {
    setI18nDebugEnabled(true)
    setLanguage("hi")
    render(
      <Fixture>
        <p>वायु गुणवत्ता</p>
        <p>Air Quality</p>
      </Fixture>,
    )
    await settle()

    const page = screen.getByTestId("page")
    expect(within(page).getByText("Air Quality")).toHaveAttribute(
      "data-i18n-untranslated",
      "true",
    )
    expect(within(page).getByText("वायु गुणवत्ता")).not.toHaveAttribute(
      "data-i18n-untranslated",
    )
    const panel = screen.getByLabelText("Translation debug")
    expect(panel).toHaveTextContent("1 string still reading as English")
  })

  it("reports a clean screen when everything is translated", async () => {
    setI18nDebugEnabled(true)
    setLanguage("bn")
    render(<Fixture><p>বায়ুর মান</p></Fixture>)
    await settle()
    expect(screen.getByLabelText("Translation debug")).toHaveTextContent(
      "No untranslated text on screen",
    )
  })

  it("has nothing to compare against in English", async () => {
    setI18nDebugEnabled(true)
    render(<Fixture><p>Air Quality</p></Fixture>)
    await settle()
    expect(screen.getByLabelText("Translation debug")).toHaveTextContent(
      /Switch to/,
    )
    expect(
      within(screen.getByTestId("page")).getByText("Air Quality"),
    ).not.toHaveAttribute("data-i18n-untranslated")
  })

  it("re-scans when the language changes, clearing stale marks", async () => {
    setI18nDebugEnabled(true)
    setLanguage("hi")
    render(<Fixture><p>Air Quality</p></Fixture>)
    await settle()
    const page = screen.getByTestId("page")
    expect(within(page).getByText("Air Quality")).toHaveAttribute(
      "data-i18n-untranslated",
    )

    act(() => setLanguage("en"))
    await settle()
    expect(within(page).getByText("Air Quality")).not.toHaveAttribute(
      "data-i18n-untranslated",
    )
  })

  it("can be switched off from the panel", async () => {
    setI18nDebugEnabled(true)
    setLanguage("hi")
    render(<Fixture><p>Air Quality</p></Fixture>)
    await settle()

    fireEvent.click(screen.getByLabelText("Turn off translation debug"))
    expect(screen.queryByLabelText("Translation debug")).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId("page")).getByText("Air Quality"),
    ).not.toHaveAttribute("data-i18n-untranslated")
    expect(isI18nDebugEnabled()).toBe(false)
  })
})
