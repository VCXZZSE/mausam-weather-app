import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import faqSource from "../../Mausam — Frequently Asked Questions.md?raw"
import { blocksToPlainText, parseMarkdown } from "./markdown"
import {
  BackChevron,
  Blocks,
  CollapsibleSection,
  splitHeading,
  useDisclosure,
} from "./markdownView"
import "./FAQPage.css"

// Bundled from Markdown at build time for the same reason as the privacy
// policy: one source of truth, and the page works offline in the WebView.
const FAQ = parseMarkdown(faqSource)

// The question number belongs to the document, not to the position on
// screen, so it survives filtering and sorting.
const HEADINGS = new Map(
  FAQ.sections.map((section, index) => [
    section.id,
    splitHeading(section.heading, index),
  ]),
)
const numberOf = (id: string) => HEADINGS.get(id)?.[0] ?? "?"
const labelOf = (id: string) => HEADINGS.get(id)?.[1] ?? ""
const anchorOf = (id: string) => `faq-${numberOf(id)}`

const TOAST_MS = 2000
const CHECK_MS = 1400

const SHORTCUTS: [string, string][] = [
  ["Ctrl / ⌘ + K, or /", "Focus search"],
  ["Esc", "Clear search and collapse all"],
  ["↑ / ↓", "Move between questions"],
  ["Enter", "Open a question"],
  ["#", "Copy a link to the focused question"],
  ["?", "Show this list"],
]

function Icon({ name }: { name: "copy" | "check" | "link" | "search" | "close" | "help" }) {
  const paths = {
    copy: "M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M5.5 9h8A1.5 1.5 0 0 1 15 10.5v8A1.5 1.5 0 0 1 13.5 20h-8A1.5 1.5 0 0 1 4 18.5v-8A1.5 1.5 0 0 1 5.5 9Z",
    check: "m5 13 4.5 4.5L19 7",
    link: "M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.2 1.2M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.2-1.2",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-3.6-3.6",
    close: "m6 6 12 12M6 18 18 6",
    help: "M9.8 9.7A2.3 2.3 0 0 1 12 8.1c1.3 0 2.2.8 2.2 1.9 0 1.8-2.2 1.7-2.2 3.4M12 16.6h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

/**
 * Marks every case-insensitive occurrence of `needle` in `text`, keeping the
 * original casing. Uses indexOf rather than a RegExp so a query containing
 * regex metacharacters — "C++", "(", "a|b" — matches literally and cannot
 * throw.
 */
function Highlight({ text, needle }: { text: string; needle: string }) {
  if (!needle) return <>{text}</>
  const haystack = text.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  for (;;) {
    const found = haystack.indexOf(needle, cursor)
    if (found === -1) break
    if (found > cursor) parts.push(text.slice(cursor, found))
    parts.push(
      <mark key={found} className="faq-mark">
        {text.slice(found, found + needle.length)}
      </mark>,
    )
    cursor = found + needle.length
  }
  if (!parts.length) return <>{text}</>
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

export function FAQPage({
  onBack,
  onHome,
}: {
  onBack: () => void
  onHome?: () => void
}) {
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState("")
  const [copied, setCopied] = useState("")
  const [helpOpen, setHelpOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const checkTimer = useRef<number | undefined>(undefined)

  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      needle
        ? FAQ.sections.filter((section) =>
            section.heading.toLowerCase().includes(needle),
          )
        : FAQ.sections,
    [needle],
  )
  const visibleIds = useMemo(() => visible.map((section) => section.id), [visible])
  const { isOpen, toggle, open, closeAll, allOpen, toggleAll } =
    useDisclosure(visibleIds)

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current)
      window.clearTimeout(checkTimer.current)
    },
    [],
  )

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(""), TOAST_MS)
  }, [])

  const copy = useCallback(
    async (text: string, message: string, mark: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        showToast("Couldn’t copy to clipboard")
        return
      }
      showToast(message)
      setCopied(mark)
      window.clearTimeout(checkTimer.current)
      checkTimer.current = window.setTimeout(() => setCopied(""), CHECK_MS)
    },
    [showToast],
  )

  const copyQA = useCallback(
    (id: string) => {
      const section = FAQ.sections.find((item) => item.id === id)
      if (!section) return
      const text = `${section.heading}\n\n${blocksToPlainText(section.blocks)}`
      copy(text, `Copied Q${numberOf(id)} to clipboard`, `qa-${id}`)
    },
    [copy],
  )

  const copyLink = useCallback(
    (id: string) => {
      // Point the address bar at the question first, so the copied URL and
      // the one the reader can bookmark are the same.
      window.history.replaceState(null, "", `#${anchorOf(id)}`)
      copy(window.location.href, `Copied link to Q${numberOf(id)}`, `link-${id}`)
    },
    [copy],
  )

  const focusSearch = useCallback(() => {
    searchRef.current?.focus()
    searchRef.current?.select()
  }, [])

  // A shared link opens straight onto its question.
  useEffect(() => {
    const target = FAQ.sections.find(
      (section) => `#${anchorOf(section.id)}` === window.location.hash,
    )
    if (!target) return
    open(target.id)
    // Optional-called: jsdom and some older WebViews do not implement it.
    document.getElementById(anchorOf(target.id))?.scrollIntoView?.({ block: "start" })
  }, [open])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      // An open modal (the profile sidebar) owns the keyboard while it lasts.
      if (document.querySelector("dialog[open]")) return
      // The target is `document` itself for a key pressed with nothing
      // focused, which has no closest().
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        !!target.closest("input, textarea, [contenteditable='true']")

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        focusSearch()
        return
      }
      if (event.key === "Escape") {
        setQuery("")
        closeAll()
        setHelpOpen(false)
        return
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return
      // "?" is Shift+/ on most layouts, so it has to be tested first.
      if (event.key === "?") {
        event.preventDefault()
        setHelpOpen((current) => !current)
        return
      }
      if (event.key === "/") {
        event.preventDefault()
        focusSearch()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [closeAll, focusSearch])

  // Arrow keys walk the headings, "#" copies a link to the focused one, and
  // Enter drops focus into the answer's first link when there is one.
  const onSectionsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const header = target.closest<HTMLButtonElement>(".doc-section-title > button")
    if (!header) return

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const headers = Array.from(
        sectionsRef.current?.querySelectorAll<HTMLButtonElement>(
          ".doc-section-title > button",
        ) ?? [],
      )
      const next = headers[headers.indexOf(header) + (event.key === "ArrowDown" ? 1 : -1)]
      next?.focus()
      return
    }

    const article = header.closest("article")
    if (event.key === "#") {
      event.preventDefault()
      const id = visible.find((section) => anchorOf(section.id) === article?.id)?.id
      if (id) copyLink(id)
      return
    }

    if (event.key === "Enter" && header.getAttribute("aria-expanded") === "false") {
      // Let the button's own activation expand it, then step inside.
      requestAnimationFrame(() =>
        article?.querySelector<HTMLAnchorElement>(".doc-panel-inner a")?.focus(),
      )
    }
  }

  const total = FAQ.sections.length
  const count = needle
    ? `${visible.length} of ${total} questions`
    : `${total} questions`
  const badges = needle ? visible.map((section) => `Q${numberOf(section.id)}`) : []

  return (
    <main
      className="personalized-page doc-page faq-page"
      aria-labelledby="faq-title"
    >
      <header className="personalized-topbar">
        <button
          className="personalized-back"
          type="button"
          onClick={onHome ?? onBack}
          aria-label="Back to home"
        >
          <BackChevron />
        </button>
        <div>
          <strong>FAQs</strong>
          <span>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 15.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm1.6-5.5c-.7.5-.9.8-.9 1.4v.3h-1.5v-.4c0-1.2.5-1.9 1.4-2.5.7-.5 1-.8 1-1.4 0-.7-.5-1.1-1.3-1.2-.8 0-1.4.4-1.6 1.2l-1.4-.5C9.7 7.8 10.8 7 12.3 7c1.7 0 2.9 1 2.9 2.5 0 1-.5 1.8-1.6 2.6Z" />
            </svg>
            Common questions about Mausam
          </span>
        </div>
      </header>

      <section className="personalized-intro faq-intro">
        <span className="personalized-eyebrow">MAUSAM · FAQS</span>
        <h1 id="faq-title">
          Questions,
          <br />
          <span>answered.</span>
        </h1>
        <p className="faq-breadcrumb" role="status">
          FAQs · {count}
          {badges.length > 0 && (
            <span className="faq-badges">
              {" ("}
              {badges.slice(0, 8).join(", ")}
              {badges.length > 8 ? ", …" : ""}
              {")"}
            </span>
          )}
        </p>
      </section>

      <div className="faq-search">
        <Icon name="search" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search FAQs…"
          aria-label="Search FAQs"
        />
        {query && (
          <button
            type="button"
            className="faq-search-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <div className="doc-toolbar">
        <button
          type="button"
          className="faq-help-trigger"
          onClick={() => setHelpOpen((current) => !current)}
          aria-expanded={helpOpen}
          aria-controls="faq-shortcuts"
          aria-label="Keyboard shortcuts"
        >
          <Icon name="help" />
          <span aria-hidden="true">Shortcuts</span>
        </button>
        <button
          type="button"
          className="doc-toggle-all"
          onClick={toggleAll}
          disabled={visible.length === 0}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {helpOpen && (
        <dl className="faq-shortcuts personalized-glass" id="faq-shortcuts">
          {SHORTCUTS.map(([keys, description]) => (
            <div key={keys + description}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      )}

      {visible.length === 0 ? (
        <div className="faq-empty personalized-glass">
          <strong>No questions match “{query.trim()}”.</strong>
          {/* Distinct from the search box's own "Clear search" ✕, so the two
              controls are told apart by name in the accessibility tree. */}
          <button type="button" onClick={() => setQuery("")}>
            Show all questions
          </button>
        </div>
      ) : (
        <div className="doc-sections" ref={sectionsRef} onKeyDown={onSectionsKeyDown}>
          {visible.map((section) => {
            const number = numberOf(section.id)
            return (
              <CollapsibleSection
                key={section.id}
                idPrefix="faq"
                id={section.id}
                anchorId={anchorOf(section.id)}
                number={number}
                label={<Highlight text={labelOf(section.id)} needle={needle} />}
                open={isOpen(section.id)}
                onToggle={() => toggle(section.id)}
                actions={
                  <>
                    <button
                      type="button"
                      className="faq-action"
                      onClick={() => copyQA(section.id)}
                      aria-label={`Copy Q${number} to clipboard`}
                    >
                      <Icon name={copied === `qa-${section.id}` ? "check" : "copy"} />
                    </button>
                    <button
                      type="button"
                      className="faq-action"
                      onClick={() => copyLink(section.id)}
                      aria-label={`Copy link to Q${number}`}
                    >
                      <Icon name={copied === `link-${section.id}` ? "check" : "link"} />
                    </button>
                  </>
                }
              >
                <Blocks blocks={section.blocks} />
              </CollapsibleSection>
            )
          })}
        </div>
      )}

      <button type="button" className="doc-return" onClick={onBack}>
        <BackChevron />
        <span>Back to briefing</span>
      </button>

      <div className="faq-toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>
    </main>
  )
}
