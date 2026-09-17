import { useCallback, useState, type ReactNode } from "react"
import type { InlineToken, MarkdownBlock } from "@/services/markdownService"
import "./documentPage.css"

// Rendering primitives shared by the Markdown-backed document pages
// (PrivacyPolicy.tsx, FAQPage.tsx). Keeping them here is what makes the two
// pages look and behave identically without either copying the other.

export function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) =>
        token.href ? (
          <a key={index} className="doc-mail" href={token.href}>
            {token.strong ? <strong>{token.text}</strong> : token.text}
          </a>
        ) : token.strong ? (
          <strong key={index}>{token.text}</strong>
        ) : (
          <span key={index}>{token.text}</span>
        ),
      )}
    </>
  )
}

export function Blocks({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <>
      {blocks.map((block, index) =>
        block.kind === "list" ? (
          <ul key={index} className="doc-list">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inline tokens={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex} className="doc-line">
                <Inline tokens={line} />
              </span>
            ))}
          </p>
        ),
      )}
    </>
  )
}

export function Chevron() {
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
      <path d="m7 10 5 5 5-5" />
    </svg>
  )
}

export function BackChevron() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

/**
 * Splits a numbered heading — "3. Data Stored on Your Device", "12. Are
 * Mausam's recommendations medical advice?" — into its chip and its label.
 */
export function splitHeading(heading: string, index: number): [string, string] {
  const numbered = /^(\d+)\.\s*(.+)$/.exec(heading)
  return numbered ? [numbered[1], numbered[2]] : [String(index + 1), heading]
}

/**
 * Open/closed state for a set of disclosure sections. `ids` is the set the
 * expand-all control acts on, which on a filtered page is only the sections
 * currently on screen.
 */
export function useDisclosure(ids: readonly string[]) {
  const [openIds, setOpenIds] = useState<readonly string[]>([])

  const toggle = useCallback((id: string) => {
    setOpenIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }, [])

  const open = useCallback((id: string) => {
    setOpenIds((current) =>
      current.includes(id) ? current : [...current, id],
    )
  }, [])

  const closeAll = useCallback(() => setOpenIds([]), [])

  const allOpen = ids.length > 0 && ids.every((id) => openIds.includes(id))

  // Collapsing touches only the listed sections, so a section hidden behind
  // a search filter keeps whatever state the reader left it in.
  const toggleAll = () =>
    setOpenIds((current) =>
      allOpen
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    )

  return {
    isOpen: (id: string) => openIds.includes(id),
    toggle,
    open,
    closeAll,
    allOpen,
    toggleAll,
  }
}

export function CollapsibleSection({
  idPrefix,
  id,
  number,
  label,
  open,
  onToggle,
  anchorId,
  actions,
  children,
}: {
  idPrefix: string
  id: string
  number: string
  label: ReactNode
  open: boolean
  onToggle: () => void
  /** Bookmark target, so the section can be linked to directly. */
  anchorId?: string
  /** Controls beside the heading. Kept outside the disclosure button,
      because a button may not contain another button. */
  actions?: ReactNode
  children: ReactNode
}) {
  const panelId = `${idPrefix}-panel-${id}`
  const buttonId = `${idPrefix}-heading-${id}`
  const heading = (
    <h2 className="doc-section-title">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="doc-section-number">{number}</span>
        <span className="doc-section-label">{label}</span>
        <Chevron />
      </button>
    </h2>
  )
  return (
    <article
      id={anchorId}
      className={`doc-section personalized-glass${open ? " is-open" : ""}`}
    >
      {actions ? (
        <div className="doc-section-head">
          {heading}
          <div className="doc-section-actions">{actions}</div>
        </div>
      ) : (
        heading
      )}
      <div
        className="doc-panel"
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
      >
        <div>
          <div className="doc-panel-inner">{children}</div>
        </div>
      </div>
    </article>
  )
}
