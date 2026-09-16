import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { LANGUAGES, useTranslation } from "./i18n"
import "./LanguageSelector.css"

/**
 * Collapsed language control: a single trigger showing the active code
 * (EN / हि / বে) that opens a compact menu of the full endonyms.
 *
 * It replaces an inline three-button group, which crowded the home header
 * against the theme switch on narrow phones. One trigger keeps the header
 * spacious while the open menu still shows every option at a readable size.
 */
export function LanguageSelector({
  className = "",
  size = "compact",
}: {
  className?: string
  /** "compact" for headers, "full" for the sidebar settings row. */
  size?: "compact" | "full"
}) {
  const { language, setLanguage, t } = useTranslation()
  const [open, setOpen] = useState(false)
  // The menu is absolutely positioned rather than portalled: the sidebar
  // renders inside a modal <dialog>, and anything portalled to <body> would
  // land beneath the top layer and be unclickable.
  const [dropUp, setDropUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const active = LANGUAGES.find((option) => option.code === language) ?? LANGUAGES[0]

  // Flip above the trigger when the viewport has no room below it.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const bounds = trigger.getBoundingClientRect()
    const needed = menu.offsetHeight + 16
    setDropUp(
      window.innerHeight - bounds.bottom < needed && bounds.top > needed,
    )
  }, [open])

  useEffect(() => {
    if (!open) return
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus()

    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      // Escape closes the menu only. preventDefault stops the surrounding
      // <dialog> (the profile sidebar) from taking the same keypress as a
      // request to close itself.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [open])

  const choose = (code: (typeof LANGUAGES)[number]["code"]) => {
    setLanguage(code)
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Roving arrow-key movement inside the open menu.
  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    event.preventDefault()
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']") ??
        [],
    )
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === "ArrowDown" ? 1 : -1
    items[(index + step + items.length) % items.length]?.focus()
  }

  return (
    <div
      ref={rootRef}
      className={`language-selector language-selector-${size}${
        open ? " is-open" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="language-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language.current", { name: active.name })}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <GlobeIcon />
        <span className="language-trigger-code" lang={active.code}>
          {active.short}
        </span>
        <ChevronIcon />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`language-menu${dropUp ? " drops-up" : ""}`}
          role="menu"
          aria-label={t("language.aria")}
          onKeyDown={onMenuKeyDown}
        >
          {LANGUAGES.map((option) => {
            const checked = option.code === language
            return (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                lang={option.code}
                className={`language-option${checked ? " is-active" : ""}`}
                onClick={() => choose(option.code)}
              >
                <span className="language-option-check" aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span className="language-option-name">{option.name}</span>
                <span className="language-option-code" aria-hidden="true">
                  {option.short}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg
      className="language-globe"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="language-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7 10 5 5 5-5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}
