import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  translate,
  type Language,
  type TranslationKey,
  type TranslationValues,
} from "./bundles/coreTranslations"
import { translateDynamic, translateDynamicList } from "./bundles/dynamicTranslations"
import { formatMeasurement, formatNumber } from "./numberFormat"
import {
  getLanguage,
  setLanguage as setStoredLanguage,
  subscribeLanguage,
} from "./languageStore"

export type Translator = {
  language: Language
  setLanguage: (language: Language) => void
  /** Static UI copy: `t("nav.home")`, `t("alerts.active", { count: 3 })`. */
  t: (key: TranslationKey, values?: TranslationValues) => string
  /** API/rules values: `td(weather.current.condition)`. Unknown text passes through. */
  td: {
    (value: string): string
    (value: string | undefined): string | undefined
  }
  /** `td` over an array — chips, tags, scale labels. */
  tdList: (values: readonly string[]) => string[]
  /** One reading, in the active language's numerals and separators: `n(9.2)`. */
  n: (
    value: number | string | null | undefined,
    options?: Intl.NumberFormatOptions,
  ) => string
  /**
   * A reading with its unit, both localised: `nu(6, "unit.kmh")` renders
   * "6 km/h", "6 किमी/घंटा" or "6 কিমি/ঘন্টা".
   */
  nu: (
    value: number | string | null | undefined,
    unitKey: TranslationKey,
    options?: Intl.NumberFormatOptions,
  ) => string
}

const LanguageContext = createContext<Translator | null>(null)

function useLanguageValue(): Translator {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    getLanguage,
  )
  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) =>
      translate(language, key, values),
    [language],
  )
  const td = useCallback(
    (value: string | undefined) => translateDynamic(language, value),
    [language],
  ) as Translator["td"]
  const tdList = useCallback(
    (values: readonly string[]) => translateDynamicList(language, values),
    [language],
  )
  const n = useCallback(
    (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, language, options),
    [language],
  )
  const nu = useCallback(
    (
      value: number | string | null | undefined,
      unitKey: TranslationKey,
      options?: Intl.NumberFormatOptions,
    ) => formatMeasurement(value, language, translate(language, unitKey), options),
    [language],
  )
  return useMemo(
    () => ({ language, setLanguage: setStoredLanguage, t, td, tdList, n, nu }),
    [language, t, td, tdList, n, nu],
  )
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const value = useLanguageValue()
  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

/**
 * Reads the active language and translators.
 *
 * Normally served by the nearest LanguageProvider. Components rendered without
 * one (isolated tests, Storybook-style harnesses) fall back to the same module
 * store the provider itself reads, so they still translate and still re-render
 * on a language change — they just do not share the provider's memoised value.
 */
export function useTranslation(): Translator {
  const fallback = useLanguageValue()
  const provided = useContext(LanguageContext)
  return provided ?? fallback
}
