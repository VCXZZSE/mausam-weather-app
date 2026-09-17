import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicy"
import { findMetaValue, parseMarkdown } from "@/services/markdownService"

const POLICY_EMAIL = "repome_maiml2024@msit.edu.in"

afterEach(cleanup)

describe("markdown reader", () => {
  it("splits a document into its title, intro and sections", () => {
    const document = parseMarkdown(
      "# Title\n\nLead line.\n\n## 1. First\n\nBody text.\n\n## 2. Second\n\n- one\n- two\n",
    )
    expect(document.title).toBe("Title")
    expect(document.sections.map((section) => section.heading)).toEqual([
      "1. First",
      "2. Second",
    ])
    expect(document.sections[0].id).toBe("1-first")
    expect(document.intro).toEqual([
      { kind: "paragraph", lines: [[{ text: "Lead line.", strong: false }]] },
    ])
    expect(document.sections[1].blocks).toEqual([
      {
        kind: "list",
        items: [
          [{ text: "one", strong: false }],
          [{ text: "two", strong: false }],
        ],
      },
    ])
  })

  it("reads bold runs, hard breaks and soft-wrapped lines", () => {
    const document = parseMarkdown(
      "# T\n\n**Email:** here  \nSecond row\n\nsoft\nwrapped\n",
    )
    const [meta, prose] = document.intro
    expect(meta).toEqual({
      kind: "paragraph",
      lines: [
        [
          { text: "Email:", strong: true },
          { text: " here", strong: false },
        ],
        [{ text: "Second row", strong: false }],
      ],
    })
    // Without a hard break the two source lines belong to one visual line.
    expect(prose).toEqual({
      kind: "paragraph",
      lines: [[{ text: "soft wrapped", strong: false }]],
    })
  })

  it("turns email addresses into mail links, bold or not", () => {
    const document = parseMarkdown("# T\n\nWrite to a@b.com or **c@d.org** today.\n")
    expect(document.intro[0]).toEqual({
      kind: "paragraph",
      lines: [
        [
          { text: "Write to ", strong: false },
          { text: "a@b.com", strong: false, href: "mailto:a@b.com" },
          { text: " or ", strong: false },
          { text: "c@d.org", strong: true, href: "mailto:c@d.org" },
          { text: " today.", strong: false },
        ],
      ],
    })
  })

  it("reads a **Label:** value line out of a block list", () => {
    const document = parseMarkdown("# T\n\n**Effective date:** 1 May 2026  \n**Publisher:** Oryza\n")
    expect(findMetaValue(document.intro, "Effective date")).toBe("1 May 2026")
    expect(findMetaValue(document.intro, "publisher")).toBe("Oryza")
    expect(findMetaValue(document.intro, "Address")).toBeNull()
  })

  it("leaves an unpaired bold marker as plain text", () => {
    expect(parseMarkdown("# T\n\na ** b\n").intro).toEqual([
      {
        kind: "paragraph",
        lines: [
          [
            { text: "a ", strong: false },
            { text: " b", strong: false },
          ],
        ],
      },
    ])
  })
})

describe("privacy policy page", () => {
  it("renders the bundled policy with every section collapsed", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your data,",
    )
    // The 13 numbered headings of the source document, all closed to start.
    const sections = screen.getAllByRole("button", { expanded: false })
    expect(sections).toHaveLength(13)
    expect(
      screen.getByRole("button", { name: /Information We Collect/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/collects only the information needed/),
    ).toBeInTheDocument()
  })

  it("reveals a section's text when its heading is activated", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    const heading = screen.getByRole("button", {
      name: /Data Stored on Your Device/,
    })
    fireEvent.click(heading)
    expect(heading).toHaveAttribute("aria-expanded", "true")

    const panel = screen.getByRole("region", {
      name: /Data Stored on Your Device/,
    })
    expect(panel.textContent).toContain(
      "theme preference in local browser/WebView storage",
    )

    fireEvent.click(heading)
    expect(heading).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps bold runs and bullet lists from the source document", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    fireEvent.click(
      screen.getByRole("button", { name: /How We Use Information/ }),
    )
    const panel = screen.getByRole("region", { name: /How We Use Information/ })
    expect(panel.querySelectorAll("li")).toHaveLength(7)

    fireEvent.click(
      screen.getByRole("button", { name: /Sharing and Disclosure/ }),
    )
    const sharing = screen.getByRole("region", {
      name: /Sharing and Disclosure/,
    })
    expect(sharing.querySelector("strong")).toHaveTextContent(
      "does not sell personal information",
    )
  })

  it("expands and collapses every section from the toolbar", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))
    expect(screen.queryAllByRole("button", { expanded: false })).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0)
  })

  it("shows the filled-in publisher, date and contact details", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    expect(screen.getByText(/Last updated 15 September 2026/)).toHaveTextContent(
      "Published by Oryza",
    )

    const contact = screen.getByRole("link", { name: /Contact privacy team/ })
    expect(contact).toHaveAttribute(
      "href",
      `mailto:${POLICY_EMAIL}?subject=Mausam%20privacy%20request`,
    )
    expect(contact).toHaveTextContent(POLICY_EMAIL)
  })

  it("links the address inside the policy text to the mail client", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Your Choices and Rights/ }))
    const panel = screen.getByRole("region", { name: /Your Choices and Rights/ })
    const link = within(panel).getByRole("link", { name: POLICY_EMAIL })
    expect(link).toHaveAttribute("href", `mailto:${POLICY_EMAIL}`)
  })

  it("no longer renders the filled placeholders", () => {
    render(<PrivacyPolicyPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))
    const page = document.querySelector(".privacy-page") as HTMLElement
    expect(page.textContent).not.toMatch(/\[Insert date\]/)
    expect(page.textContent).not.toMatch(/\[Insert legal\/business name\]/)
    expect(page.textContent).not.toMatch(/\[Insert privacy email\]/)
  })

  it("offers a way back to home at the top and to the briefing at the foot of the page", () => {
    const onBack = vi.fn()
    const onHome = vi.fn()
    render(<PrivacyPolicyPage onBack={onBack} onHome={onHome} />)
    const homeButton = screen.getByRole("button", { name: "Back to home" })
    const briefingButton = screen.getByRole("button", { name: "Back to briefing" })
    fireEvent.click(homeButton)
    expect(onHome).toHaveBeenCalledTimes(1)
    fireEvent.click(briefingButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("falls back to onBack when onHome is not provided", () => {
    const onBack = vi.fn()
    render(<PrivacyPolicyPage onBack={onBack} />)
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }))
    expect(onBack).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Back to briefing" }))
    expect(onBack).toHaveBeenCalledTimes(2)
  })
})
