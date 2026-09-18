import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import {
  findUntranslatedText,
  getDynamicMisses,
  isI18nDebugEnabled,
  setI18nDebugEnabled,
  subscribeDynamicMisses,
  type UntranslatedHit,
} from "./debug"
import { useTranslation } from "./LanguageContext"
import { LANGUAGES } from "./bundles/coreTranslations"
import { Icon } from "@/components/icons/Icon"

// Inlined rather than imported from a .css file so the styles are dropped
// along with the component in production: a stylesheet import is bundled
// into the app CSS even when the component that imports it never renders.
const DEBUG_STYLES = `[data-i18n-untranslated="true"] { outline: 2px dashed #ff3b5c !important; outline-offset: 1px; background: rgba(255, 59, 92, 0.16) !important; border-radius: 3px; } .i18n-debug-panel { position: fixed; right: 12px; bottom: 12px; z-index: 2147483000; width: min(330px, calc(100vw - 24px)); max-height: min(60vh, 460px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255, 59, 92, 0.45); border-radius: 14px; background: #16080d; color: #ffe9ed; font: 500 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55); } .i18n-debug-panel header { display: flex; align-items: center; flex-shrink: 0; border-bottom: 1px solid rgba(255, 59, 92, 0.28); } .i18n-debug-toggle { display: flex; align-items: center; gap: 8px; flex: 1; min-height: 38px; padding: 0 12px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; } .i18n-debug-toggle strong { margin-left: auto; padding: 1px 8px; border-radius: 999px; background: #ff3b5c; color: #fff; font-size: 11px; } .i18n-debug-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff3b5c; box-shadow: 0 0 8px #ff3b5c; } .i18n-debug-close { min-width: 34px; min-height: 38px; border: 0; background: transparent; color: rgba(255, 233, 237, 0.6); font: inherit; cursor: pointer; } .i18n-debug-close:hover { color: #fff; } .i18n-debug-body { overflow-y: auto; padding: 10px 12px 12px; } .i18n-debug-note { margin: 0 0 8px; color: rgba(255, 233, 237, 0.72); } .i18n-debug-clean { color: #7ff0a8; } .i18n-debug-body ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; } .i18n-debug-body ol li button { display: block; width: 100%; padding: 6px 8px; border: 1px solid rgba(255, 59, 92, 0.3); border-radius: 8px; background: rgba(255, 59, 92, 0.1); color: #fff; font: inherit; text-align: left; word-break: break-word; cursor: pointer; } .i18n-debug-body ol li button:hover { background: rgba(255, 59, 92, 0.2); } .i18n-debug-body ol li small { display: block; margin-top: 3px; color: rgba(255, 233, 237, 0.5); font-size: 10px; } .i18n-debug-misses { margin-top: 10px; color: rgba(255, 233, 237, 0.62); } .i18n-debug-misses summary { cursor: pointer; } .i18n-debug-misses ul { margin: 6px 0 0; padding-left: 16px; word-break: break-word; } .i18n-debug-hint { margin: 10px 0 0; color: rgba(255, 233, 237, 0.42); font-size: 10px; } .i18n-debug-hint code { color: #ffb7c4; } @media (prefers-reduced-motion: reduce) { .i18n-debug-panel * { transition: none; } }`

/**
 * Highlights text that is still English while a non-English language is active.
 *
 * It marks elements with a `data-i18n-untranslated` attribute rather than
 * wrapping the text in new nodes: React owns this DOM, and inserting elements
 * into a text node it manages would break reconciliation. An attribute React
 * does not set is left alone on re-render, and the observer re-applies it
 * anyway if a subtree is replaced.
 *
 * Enable with `?i18nDebug=1`. Renders nothing otherwise, and is excluded from
 * production builds by the caller.
 */
export function I18nDebugOverlay() {
  const { language } = useTranslation()
  const [enabled, setEnabled] = useState(isI18nDebugEnabled)
  const [hits, setHits] = useState<UntranslatedHit[]>([])
  const [panelOpen, setPanelOpen] = useState(true)
  const marked = useRef(new Set<Element>())
  const misses = useSyncExternalStore(
    subscribeDynamicMisses,
    getDynamicMisses,
    getDynamicMisses,
  )

  const clearMarks = useCallback(() => {
    for (const element of marked.current)
      element.removeAttribute("data-i18n-untranslated")
    marked.current.clear()
  }, [])

  const rescan = useCallback(() => {
    clearMarks()
    if (!enabled || language === "en") {
      setHits([])
      return
    }
    const found = findUntranslatedText(document.body).filter(
      // Never flag the overlay's own report of the English it found.
      (hit) => !hit.element.closest("[data-i18n-debug-panel]"),
    )
    for (const hit of found) {
      hit.element.setAttribute("data-i18n-untranslated", "true")
      marked.current.add(hit.element)
    }
    setHits(found)
  }, [clearMarks, enabled, language])

  useEffect(() => {
    if (!enabled) {
      clearMarks()
      setHits([])
      return
    }
    // Debounced: a scan walks the whole tree, and React commits in bursts.
    let frame = 0
    const schedule = () => {
      window.clearTimeout(frame)
      frame = window.setTimeout(rescan, 150)
    }
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    return () => {
      observer.disconnect()
      window.clearTimeout(frame)
      clearMarks()
    }
  }, [clearMarks, enabled, rescan])

  if (!enabled) return null

  const languageName =
    LANGUAGES.find((option) => option.code === language)?.name ?? language

  return createPortal(
    <aside
      className={`i18n-debug-panel${panelOpen ? " is-open" : ""}`}
      data-i18n-debug-panel
      data-i18n-ignore
      aria-label="Translation debug"
    >
      <style>{DEBUG_STYLES}</style>
      <header>
        <button
          type="button"
          className="i18n-debug-toggle"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
        >
          <span className="i18n-debug-dot" aria-hidden="true" />
          i18n · {languageName}
          <strong>{language === "en" ? "—" : hits.length}</strong>
        </button>
        <button
          type="button"
          className="i18n-debug-close"
          aria-label="Turn off translation debug"
          onClick={() => {
            setI18nDebugEnabled(false)
            setEnabled(false)
          }}
        >
          <Icon name="close" strokeWidth={2} />
        </button>
      </header>

      {panelOpen && (
        <div className="i18n-debug-body">
          {language === "en" ? (
            <p className="i18n-debug-note">
              Switch to हिन्दी or বাংলা — there is nothing to compare against in
              English.
            </p>
          ) : hits.length === 0 ? (
            <p className="i18n-debug-note i18n-debug-clean">
              No untranslated text on screen.
            </p>
          ) : (
            <>
              <p className="i18n-debug-note">
                {hits.length} string{hits.length === 1 ? "" : "s"} still reading
                as English, outlined in red.
              </p>
              <ol>
                {hits.map((hit) => (
                  <li key={hit.text}>
                    <button
                      type="button"
                      onClick={() =>
                        hit.element.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                      }
                    >
                      {hit.text}
                    </button>
                    <small>
                      {hit.reportedByTranslator
                        ? "missing from the dictionary"
                        : "never passed through t()/td()"}
                    </small>
                  </li>
                ))}
              </ol>
            </>
          )}
          {misses.length > 0 && (
            <details className="i18n-debug-misses">
              <summary>{misses.length} dictionary misses this session</summary>
              <ul>
                {misses.map((miss) => (
                  <li key={miss}>{miss}</li>
                ))}
              </ul>
            </details>
          )}
          <p className="i18n-debug-hint">
            Toggle with <code>?i18nDebug=1</code> / <code>?i18nDebug=0</code>.
          </p>
        </div>
      )}
    </aside>,
    document.body,
  )
}
