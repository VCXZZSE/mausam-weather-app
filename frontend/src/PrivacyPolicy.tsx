import { useMemo } from "react"
import policySource from "../../Mausam — Privacy Policy.md?raw"
import { findMetaValue, parseMarkdown } from "./markdown"
import {
  BackChevron,
  Blocks,
  CollapsibleSection,
  splitHeading,
  useDisclosure,
} from "./markdownView"
import "./PrivacyPolicy.css"

// The policy is bundled from its Markdown source at build time, so the page
// works offline in the Android WebView exactly as it does on the web and
// stays in step with the published document.
const POLICY = parseMarkdown(policySource)

// The footer reads its own details out of the document rather than repeating
// them here, so editing the Markdown is enough to change them everywhere.
const EFFECTIVE_DATE = findMetaValue(POLICY.intro, "Effective date")
const PUBLISHER = findMetaValue(POLICY.intro, "Publisher")
const CONTACT_EMAIL = findMetaValue(POLICY.intro, "Contact")

export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  const ids = useMemo(() => POLICY.sections.map((section) => section.id), [])
  const { isOpen, toggle, allOpen, toggleAll } = useDisclosure(ids)

  return (
    <main
      className="personalized-page doc-page privacy-page"
      aria-labelledby="privacy-title"
    >
      <header className="personalized-topbar">
        <button
          className="personalized-back"
          type="button"
          onClick={onBack}
          aria-label="Back to briefing"
        >
          <BackChevron />
        </button>
        <div>
          <strong>Privacy policy</strong>
          <span>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm0 5a2.5 2.5 0 0 1 2.5 2.5V11h.5v5h-6v-5h.5V9.5A2.5 2.5 0 0 1 12 7Zm0 1.6c-.5 0-1 .4-1 .9V11h2V9.5c0-.5-.4-.9-1-.9Z" />
            </svg>
            How Mausam handles your data
          </span>
        </div>
      </header>

      <section className="personalized-intro privacy-intro">
        <span className="personalized-eyebrow">MAUSAM · PRIVACY</span>
        <h1 id="privacy-title">
          Your data,
          <br />
          <span>in plain words.</span>
        </h1>
      </section>

      {POLICY.intro.length > 0 && (
        <section
          className="privacy-summary personalized-glass"
          aria-label="Policy summary"
        >
          <Blocks blocks={POLICY.intro} />
        </section>
      )}

      <div className="doc-toolbar">
        <span className="doc-count">{POLICY.sections.length} sections</span>
        <button type="button" className="doc-toggle-all" onClick={toggleAll}>
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="doc-sections">
        {POLICY.sections.map((section, index) => {
          const [number, label] = splitHeading(section.heading, index)
          return (
            <CollapsibleSection
              key={section.id}
              idPrefix="privacy"
              id={section.id}
              number={number}
              label={label}
              open={isOpen(section.id)}
              onToggle={() => toggle(section.id)}
            >
              <Blocks blocks={section.blocks} />
            </CollapsibleSection>
          )
        })}
      </div>

      <footer className="privacy-footer">
        {CONTACT_EMAIL && (
          <a
            className="privacy-contact"
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
              "Mausam privacy request",
            )}`}
          >
            <span>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.6 2L12 11.6 18.4 7H5.6Z" />
              </svg>
            </span>
            <span>
              <strong>Contact privacy team</strong>
              <small>{CONTACT_EMAIL}</small>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </a>
        )}
        {EFFECTIVE_DATE && (
          <p className="privacy-version">
            Last updated {EFFECTIVE_DATE}
            {PUBLISHER ? ` · Published by ${PUBLISHER}` : ""}
          </p>
        )}
      </footer>

      <button type="button" className="doc-return" onClick={onBack}>
        <BackChevron />
        <span>Back to briefing</span>
      </button>
    </main>
  )
}
