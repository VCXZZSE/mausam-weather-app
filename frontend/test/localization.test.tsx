import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { LanguageSelector } from "@/components/language/LanguageSelector"
import { MausamMenuButton, ProfileSidebar } from "@/components/layout/ProfileSidebar"
import App from "@/App"
import { LanguageProvider, useTranslation } from "@/i18n"
import {
  CATALOGUES,
  LANGUAGES,
  translate,
  type Language,
  type TranslationKey,
} from "@/i18n/bundles/coreTranslations"
import { translateDynamic } from "@/i18n/bundles/dynamicTranslations"

/** Any pictograph, used to compare translations ignoring the marks. */
const EMOJI_ANYWHERE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu
import { LANGUAGE_STORAGE_KEY, setLanguage } from "@/i18n/languageStore"
import type { Profile } from "@/App"

const profile: Profile = {
  name: "Aditi Roy", gender: "Female", age: 29, activity: "Moderate",
  goals: ["Fitness"], sensitivities: ["Heat"], concerns: ["Allergies"],
}
const location = {
  latitude: 22.5, longitude: 88.3, locality: "Kolkata", region: "West Bengal",
  country: "India", timezone: "Asia/Kolkata", postalCode: "700150",
  source: "manual" as const,
}
function sidebarProps() {
  return {
    open: true, profile, location, theme: "light" as const,
    onClose: vi.fn(), onChangeLocation: vi.fn(), onLogout: vi.fn(),
    onBriefing: vi.fn(), onPrivacy: vi.fn(), onFAQ: vi.fn(),
  }
}

const HI = "हिन्दी"
const BN = "বাংলা"
const OTHER_LANGUAGES: Language[] = ["hi", "bn"]

/** Opens the collapsed selector in `scope` and picks `name` from its menu. */
function pickLanguage(name: string, scope: HTMLElement = document.body) {
  // The header also holds the menu button, so the trigger is identified by the
  // popup it owns rather than by position.
  const trigger = within(scope)
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-haspopup") === "menu")
  fireEvent.click(trigger!)
  fireEvent.click(screen.getByRole("menuitemradio", { name: new RegExp(name) }))
}
const englishKeys = Object.keys(CATALOGUES.en) as TranslationKey[]
const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

beforeEach(() => {
  localStorage.clear()
  setLanguage("en")
})
afterEach(() => {
  cleanup()
  setLanguage("en")
  localStorage.clear()
})

describe("translation catalogues", () => {
  it.each(OTHER_LANGUAGES)("covers every English key in %s", (language) => {
    const missing = englishKeys.filter((key) => !CATALOGUES[language][key]?.trim())
    expect(missing).toEqual([])
  })

  it.each(OTHER_LANGUAGES)("keeps the same placeholders as English in %s", (language) => {
    const mismatched = englishKeys.filter(
      (key) =>
        placeholders(CATALOGUES.en[key]).join() !==
        placeholders(CATALOGUES[language][key]).join(),
    )
    expect(mismatched).toEqual([])
  })

  // Templates made only of numbers, symbols and already-translated slots —
  // "{value}°C", "{index} · {label}", the AQI and UV acronyms. Everything else
  // must differ from its English source, or it was never actually translated.
  const SYMBOLS_ONLY = new Set<string>([
    "unit.percent",
    "unit.degree",
    "gen.degC",
    "gen.percent",
    "gen.tempRange",
    "gen.window",
    "gen.windowOnDay",
    "gen.indexWithLabel",
    "gen.uvWithLabel",
    "gen.aqiValue",
    "gen.pollutantValue",
    "gen.rainAmount",
    "gen.label.uv",
    "gen.label.aqi",
    "badge.indiaAqi",
    // The SI symbol for pressure. Unlike "km" or "mm", which the catalogues
    // render in Devanagari and Bengali, hPa is written in Latin in Hindi and
    // Bengali meteorological copy too, so all three entries agree on purpose.
    "unit.hpa",
  ])

  it.each(OTHER_LANGUAGES)("actually translates, rather than copying English, in %s", (language) => {
    const identical = englishKeys.filter(
      (key) =>
        CATALOGUES[language][key] === CATALOGUES.en[key] &&
        !SYMBOLS_ONLY.has(key),
    )
    expect(identical).toEqual([])
  })

  it("interpolates values and falls back to English for an unknown language", () => {
    expect(translate("hi", "alerts.active", { count: 3 })).toContain("3")
    expect(translate("en", "hero.feels", { value: 31 })).toBe("Feels 31°")
    expect(translate("xx" as Language, "nav.home")).toBe("Home")
  })

  it("leaves unknown placeholders untouched", () => {
    expect(translate("en", "hero.highLow", { high: 35 })).toBe("H:35° L:{low}°")
  })
})

describe("language selector", () => {
  it("collapses to a single trigger showing the active code", () => {
    render(<LanguageProvider><LanguageSelector /></LanguageProvider>)
    const trigger = screen.getByRole("button", { name: "Current language: English" })
    expect(trigger).toHaveTextContent("EN")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("opens a menu of all three languages, checking the active one", () => {
    render(<LanguageProvider><LanguageSelector /></LanguageProvider>)
    fireEvent.click(screen.getByRole("button", { name: /Current language/ }))
    const menu = screen.getByRole("menu", { name: "Select language" })
    const items = within(menu).getAllByRole("menuitemradio")
    expect(items.map((item) => item.querySelector(".language-option-name")?.textContent))
      .toEqual(["English", "हिन्दी", "বাংলা"])
    expect(items[0]).toBeChecked()
    expect(items[1]).not.toBeChecked()
  })

  it("switches the active language, closes the menu and re-labels itself", () => {
    render(<LanguageProvider><LanguageSelector /></LanguageProvider>)
    pickLanguage(HI)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    const trigger = screen.getByRole("button")
    expect(trigger).toHaveTextContent("हि")
    expect(trigger).toHaveAccessibleName("वर्तमान भाषा: हिन्दी")
  })

  it("closes on Escape and on an outside click without changing the language", () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
        <button type="button">outside</button>
      </LanguageProvider>,
    )
    const trigger = screen.getByRole("button", { name: /Current language/ })

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByRole("button", { name: "outside" }))
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveTextContent("EN")
  })

  it("moves between options with the arrow keys", () => {
    render(<LanguageProvider><LanguageSelector /></LanguageProvider>)
    fireEvent.click(screen.getByRole("button", { name: /Current language/ }))
    const items = screen.getAllByRole("menuitemradio")
    expect(items[0]).toHaveFocus()
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" })
    expect(items[1]).toHaveFocus()
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" })
    expect(items[0]).toHaveFocus()
  })
})

describe("global language state", () => {
  function Probe() {
    const { t, language } = useTranslation()
    return <p data-testid="probe">{language}:{t("nav.home")}</p>
  }

  it("defaults to English when nothing is stored", () => {
    render(<LanguageProvider><Probe /></LanguageProvider>)
    expect(screen.getByTestId("probe")).toHaveTextContent("en:Home")
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
  })

  it("re-renders every consumer when the language changes", () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
        <Probe />
      </LanguageProvider>,
    )
    pickLanguage(BN)
    expect(screen.getByTestId("probe")).toHaveTextContent("bn:হোম")
  })

  it("translates for components rendered without a provider", () => {
    render(<Probe />)
    act(() => setLanguage("hi"))
    expect(screen.getByTestId("probe")).toHaveTextContent("hi:होम")
  })

  it("persists the choice to localStorage", () => {
    render(<LanguageProvider><LanguageSelector /></LanguageProvider>)
    pickLanguage(HI)
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("hi")
  })

  it("restores a persisted choice on the next load", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "bn")
    vi.resetModules()
    const { getLanguage } = await import("../src/i18n/languageStore")
    expect(getLanguage()).toBe("bn")
  })

  it("ignores a corrupted stored value and falls back to English", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "klingon")
    vi.resetModules()
    const { getLanguage } = await import("../src/i18n/languageStore")
    expect(getLanguage()).toBe("en")
  })
})

describe("document direction", () => {
  // Devanagari and Bengali are left-to-right scripts, so no RTL mirroring is
  // needed — this pins that, and pins `lang` for font fallback and screen readers.
  it.each(LANGUAGES.map((option) => option.code))("keeps <html> LTR for %s", (code) => {
    setLanguage(code)
    expect(document.documentElement.lang).toBe(code)
    expect(document.documentElement.dir).toBe("ltr")
  })
})

describe("dynamic (API-sourced) values", () => {
  it("returns English input untouched", () => {
    expect(translateDynamic("en", "Heavy rain")).toBe("Heavy rain")
  })

  it("translates known weather vocabulary", () => {
    expect(translateDynamic("hi", "Heavy rain")).toBe("भारी वर्षा")
    expect(translateDynamic("bn", "Very Poor")).toBe("খুব খারাপ")
    expect(translateDynamic("hi", "Comfortable")).toBe("आरामदायक")
  })

  it("passes free text through unchanged", () => {
    for (const language of OTHER_LANGUAGES) {
      expect(translateDynamic(language, "Rabindra Sarobar, Kolkata")).toBe(
        "Rabindra Sarobar, Kolkata",
      )
      expect(translateDynamic(language, "")).toBe("")
      expect(translateDynamic(language, undefined)).toBeUndefined()
    }
  })

  it("handles numeric composites and emoji-prefixed advice", () => {
    expect(translateDynamic("hi", "India AQI 154 · UV 8")).toBe("भारत AQI 154 · UV 8")
    expect(translateDynamic("bn", "Wind 18 km/h")).toBe("বাতাস 18 কিমি/ঘন্টা")
    expect(translateDynamic("hi", "~25 min")).toBe("~25 मिनट")
    expect(translateDynamic("hi", "🧴 Reapply SPF every 2h")).toBe(
      "🧴 हर 2 घंटे में SPF दोबारा लगाएँ",
    )
  })

  it("translates personalised briefing copy", () => {
    expect(translateDynamic("hi", "Keep sun protection nearby")).toBe(
      "धूप से बचाव पास रखें",
    )
    expect(
      translateDynamic("bn", "Weather guidance only — not medical advice."),
    ).toBe("শুধুমাত্র আবহাওয়া সংক্রান্ত দিকনির্দেশ — চিকিৎসা পরামর্শ নয়।")
  })

  it("translates Alerts & Travel saved locations, packing, and event details", () => {
    // Hindi
    expect(translateDynamic("hi", "Darjeeling")).toBe("दार्जिलिंग")
    expect(translateDynamic("hi", "Digha Beach")).toBe("दीघा बीच")
    expect(translateDynamic("hi", "Sundarbans")).toBe("सुंदरबन")
    expect(translateDynamic("hi", "Siliguri")).toBe("सिलीगुड़ी")
    expect(translateDynamic("hi", "Weekend Outdoor Weather Outlook")).toBe("सप्ताहांत बाहरी मौसम परिदृश्य")
    expect(translateDynamic("hi", "19 Sept–20 Sept")).toBe("19 सितंबर–20 सितंबर")
    expect(translateDynamic("hi", "For Kolkata · 18 Sept 2026")).toBe("कोलकाता के लिए · 18 सितंबर 2026")
    expect(translateDynamic("hi", "Monsoon")).toBe("मानसून")
    expect(translateDynamic("hi", "High Rain")).toBe("भारी वर्षा")

    // Bengali
    expect(translateDynamic("bn", "Darjeeling")).toBe("দার্জিলিং")
    expect(translateDynamic("bn", "Digha Beach")).toBe("দিঘা সৈকত")
    expect(translateDynamic("bn", "Sundarbans")).toBe("সুন্দরবন")
    expect(translateDynamic("bn", "Siliguri")).toBe("শিলিগুড়ি")
    expect(translateDynamic("bn", "Weekend Outdoor Weather Outlook")).toBe("উইকএন্ডের বাইরের আবহাওয়ার পূর্বাভাস")
    expect(translateDynamic("bn", "19 Sept–20 Sept")).toBe("19 সেপ্টেম্বর–20 সেপ্টেম্বর")
    expect(translateDynamic("bn", "For Kolkata · 18 Sept 2026")).toBe("কলকাতা-এর জন্য · 18 সেপ্টেম্বর 2026")
    expect(translateDynamic("bn", "Monsoon")).toBe("বর্ষা")
    expect(translateDynamic("bn", "High Rain")).toBe("ভারী বৃষ্টি")
  })
})

describe("app surfaces render in every language", () => {
  it.each(["en", "hi", "bn"] as const)("keeps Mausam header badging in English across %s", (code) => {
    setLanguage(code)
    render(
      <LanguageProvider>
        <MausamMenuButton onClick={() => {}} expanded={false} />
      </LanguageProvider>,
    )
    expect(screen.getByText("Mausam")).toBeInTheDocument()
  })
  it.each([
    ["en", "Your profile", "Log out", "Change location"],
    ["hi", "आपकी प्रोफ़ाइल", "लॉग आउट", "स्थान बदलें"],
    ["bn", "আপনার প্রোফাইল", "লগ আউট", "স্থান পরিবর্তন করুন"],
  ] as const)("renders the sidebar in %s", (code, heading, logout, changeLocation) => {
    setLanguage(code)
    render(<LanguageProvider><ProfileSidebar {...sidebarProps()} /></LanguageProvider>)
    const drawer = screen.getByRole("dialog", { name: "Aditi Roy" })
    expect(within(drawer).getByRole("heading", { name: heading })).toBeInTheDocument()
    expect(within(drawer).getByRole("button", { name: logout })).toBeInTheDocument()
    expect(
      within(drawer).getByRole("button", { name: new RegExp(changeLocation) }),
    ).toBeInTheDocument()
  })

  it("translates stored profile vocabulary rather than the raw English value", () => {
    setLanguage("hi")
    render(<LanguageProvider><ProfileSidebar {...sidebarProps()} /></LanguageProvider>)
    fireEvent.click(screen.getByText("आपकी प्राथमिकताएँ"))
    // "Heat" / "Allergies" are stored in English on the profile.
    expect(screen.getByText("गर्मी")).toBeVisible()
    expect(screen.getByText("एलर्जी")).toBeVisible()
  })

  it("switches the sidebar live from its own selector, without a remount", () => {
    render(
      <LanguageProvider>
        <ProfileSidebar {...sidebarProps()} />
      </LanguageProvider>,
    )
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument()
    pickLanguage(BN, screen.getByRole("dialog"))
    expect(screen.getByRole("button", { name: "লগ আউট" })).toBeInTheDocument()
  })
})

describe("dashboard renders in every language", () => {
  // The demo dataset renders the whole dashboard without a network round trip.
  beforeEach(() => {
    vi.stubEnv("VITE_USE_DEMO_WEATHER", "true")
    localStorage.setItem(
      "mausam-profile",
      JSON.stringify({
        name: "Aditi", sensitivities: [], concerns: [], goals: ["Daily energy"],
        age: 29, activity: "Moderate",
      }),
    )
    localStorage.setItem(
      "mausam-location",
      JSON.stringify({
        latitude: 22.5726, longitude: 88.3639, locality: "Kolkata",
        region: "West Bengal", country: "India", timezone: "Asia/Kolkata",
        source: "device",
      }),
    )
  })
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ["en", "Today's Metrics", "Air Quality", "UV Index"],
    ["hi", "आज के आँकड़े", "वायु गुणवत्ता", "UV सूचकांक"],
    ["bn", "আজকের পরিমাপ", "বায়ুর মান", "UV সূচক"],
  ] as const)("shows the home dashboard in %s", async (code, metrics, air, uv) => {
    setLanguage(code)
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText(metrics)).toBeInTheDocument(),
    )
    expect(screen.getByText(air)).toBeInTheDocument()
    expect(screen.getByText(uv)).toBeInTheDocument()
  })

  it("switches the live dashboard from the sidebar selector", async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText("Today's Metrics")).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole("button", { name: /open mausam menu|open profile and settings/i }))
    const sidebar = await screen.findByRole("dialog")
    pickLanguage(BN, sidebar)
    expect(screen.getByText("আজকের পরিমাপ")).toBeInTheDocument()
    // The API-sourced condition text is translated too, not just the chrome.
    expect(screen.getByText("ঝলমলে রোদ")).toBeInTheDocument()
  })

  it("resets language to English and clears all stored data on logout", async () => {
    setLanguage("hi")
    render(<App />)
    await waitFor(() =>
      expect(screen.getByText("आज के आँकड़े")).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole("button", { name: /open mausam menu|मौसम मेन्यू खोलें|open profile and settings/i }))
    const sidebar = await screen.findByRole("dialog")
    fireEvent.click(within(sidebar).getByRole("button", { name: "लॉग आउट" }))
    await waitFor(() =>
      expect(screen.getByText(/feel the/i)).toBeInTheDocument(),
    )
    expect(localStorage.getItem("mausam-language")).toBeNull()
    expect(localStorage.getItem("mausam-profile")).toBeNull()
    expect(localStorage.getItem("mausam-location")).toBeNull()
  })
})


// Every advice/note string the rules engine can emit — the same 29 the audit
// script counts, so the test and the report cannot disagree.
//
// Each pair is the string as it was before commit 4 stripped its mark, and the
// string as it is emitted now. Translation keys were always emoji-free (the
// EMOJI_PREFIX branch stripped the mark before looking one up), so removing it
// at the source must change nothing a reader sees.
describe("every advisory string survives losing its emoji prefix", () => {
  const stripMarks = (value: string) =>
    value.replace(EMOJI_ANYWHERE, "").replace(/\s+/g, " ").trim()

  const isTranslated = (language: "hi" | "bn", text: string) =>
    stripMarks(translateDynamic(language, text)) !== stripMarks(text)

  const ADVISORY_PAIRS: Array<[string, string]> = [
    ["✅ Air quality is good — safe for outdoor activity.", "Air quality is good — safe for outdoor activity."],
    ["🙂 Air quality is acceptable for most people.", "Air quality is acceptable for most people."],
    ["💡 Sensitive groups should reduce prolonged outdoor exertion.", "Sensitive groups should reduce prolonged outdoor exertion."],
    ["😷 Limit prolonged outdoor exertion; consider a mask.", "Limit prolonged outdoor exertion; consider a mask."],
    ["🚫 Avoid outdoor exertion; keep windows closed.", "Avoid outdoor exertion; keep windows closed."],
    ["🚨 Severe air quality — stay indoors if possible.", "Severe air quality — stay indoors if possible."],
    ["🙂 Pleasant conditions for outdoor activity.", "Pleasant conditions for outdoor activity."],
    ["💧 Stay hydrated and take breaks if outdoors for long.", "Stay hydrated and take breaks if outdoors for long."],
    ["⚠️ Limit prolonged outdoor exposure; conditions are taxing.", "Limit prolonged outdoor exposure; conditions are taxing."],
    ["💧 Drink 3–4L water today · Avoid exertion 11 AM–4 PM · Use ORS if feeling dehydrated", "Drink 3–4L water today · Avoid exertion 11 AM–4 PM · Use ORS if feeling dehydrated"],
    ["💧 Drink 2–3L water today · Limit strenuous activity during peak heat", "Drink 2–3L water today · Limit strenuous activity during peak heat"],
    ["💧 Stay hydrated — drink water regularly through the day", "Stay hydrated — drink water regularly through the day"],
    ["🧴 Light sun protection recommended for extended outdoor time", "Light sun protection recommended for extended outdoor time"],
    ["🚫 Swimming not advised due to thunderstorm risk", "Swimming not advised due to thunderstorm risk"],
    ["🚫 Swimming not advised due to heavy rain", "Swimming not advised due to heavy rain"],
    ["⚠️ Rough conditions expected due to strong wind", "Rough conditions expected due to strong wind"],
    ["🧴 High UV — use waterproof sunscreen and limit exposure time", "High UV — use waterproof sunscreen and limit exposure time"],
    ["✅ Good conditions for swimming", "Good conditions for swimming"],
    ["💡 High rain chance this weekend — plan indoor alternatives or flexible timing.", "High rain chance this weekend — plan indoor alternatives or flexible timing."],
    ["💡 Some rain possible — keep an eye on the forecast closer to the date.", "Some rain possible — keep an eye on the forecast closer to the date."],
    ["💡 Favorable weather expected — good window for outdoor plans.", "Favorable weather expected — good window for outdoor plans."],
    ["🤧 Keep windows closed during peak hours · Antihistamine recommended if allergy-prone", "Keep windows closed during peak hours · Antihistamine recommended if allergy-prone"],
    ["🌿 Sensitive individuals should monitor symptoms outdoors", "Sensitive individuals should monitor symptoms outdoors"],
    ["🌿 Pollen levels are low — minimal precaution needed", "Pollen levels are low — minimal precaution needed"],
    ["🐟 Hilsa season active!", "Hilsa season active!"],
    ["🌾 Harvest season for local paddy fields", "Harvest season for local paddy fields"],
    ["🥦 Good season for leafy greens and winter vegetables", "Good season for leafy greens and winter vegetables"],
    ["🌱 Prepare soil ahead of monsoon sowing", "Prepare soil ahead of monsoon sowing"],
    ["☂️ Carry umbrella · 😎 Wear sunglasses · 🧴 Reapply SPF every 2h", "Carry umbrella · Wear sunglasses · Reapply SPF every 2h"],
  ]

  it("covers the same set the audit reports", () => {
    expect(ADVISORY_PAIRS).toHaveLength(29)
  })

  it.each(ADVISORY_PAIRS)("%s", (before, after) => {
    for (const language of ["hi", "bn"] as const) {
      // Stripping the mark must never cost a translation.
      expect(
        isTranslated(language, after),
        `"${after}" used to translate into ${language} and no longer does`,
      ).toBe(isTranslated(language, before))

      // And the words must come out the same as they did with the mark.
      expect(stripMarks(translateDynamic(language, after))).toBe(
        stripMarks(translateDynamic(language, before)),
      )
    }
  })

  // Comparing before-against-after is symmetric: if a string had no
  // translation, both sides return English and the comparison passes while
  // proving nothing. This asserts the set is genuinely translated, and is the
  // number the audit script reports.
  it("leaves nothing reaching hi/bn readers in English", () => {
    const untranslated = ADVISORY_PAIRS.filter(
      ([, after]) => !isTranslated("hi", after) || !isTranslated("bn", after),
    ).map(([, after]) => after)

    expect(
      untranslated,
      `still English for at least one language: ${untranslated.join(" | ")}`,
    ).toEqual([])
  })
})
