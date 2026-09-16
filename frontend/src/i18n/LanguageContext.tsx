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
} from "./translations"
import { translateDynamic, translateDynamicList } from "./dynamicTranslations"
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
  return useMemo(
    () => ({ language, setLanguage: setStoredLanguage, t, td, tdList }),
    [language, t, td, tdList],
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
