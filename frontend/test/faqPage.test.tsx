import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FAQPage } from "../src/FAQPage"

const FAQ_EMAIL = "repome_maiml2024@msit.edu.in"

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
})

afterEach(() => {
  cleanup()
  // copyLink writes to the address bar; a leaked hash would auto-expand a
  // question in the next test.
  window.history.replaceState(null, "", window.location.pathname)
})

/** The question list, excluding other disclosures on the page (the
    shortcuts trigger and, in the full app, the menu button). */
function list() {
  return document.querySelector(".doc-sections") as HTMLElement | null
}
const closedQuestions = () => {
  const container = list()
  return container ? within(container).queryAllByRole("button", { expanded: false }) : []
}
const openQuestions = () => {
  const container = list()
  return container ? within(container).queryAllByRole("button", { expanded: true }) : []
}
const search = () => screen.getByRole("searchbox", { name: "Search FAQs" })
const type = (value: string) => fireEvent.change(search(), { target: { value } })

describe("FAQ page", () => {
  it("renders all 18 question and answer pairs, collapsed", () => {
    render(<FAQPage onBack={vi.fn()} />)
    expect(closedQuestions()).toHaveLength(18)
    expect(screen.getByRole("button", { name: /What is Mausam\?/ })).toBeInTheDocument()

    const panels = screen.getAllByRole("region")
    expect(panels).toHaveLength(18)
    for (const panel of panels) expect(panel.textContent?.trim()).not.toBe("")
  })

  it("keeps the document's own numbering on the chips", () => {
    render(<FAQPage onBack={vi.fn()} />)
    expect(screen.getByRole("button", { name: /What is Mausam\?/ })).toHaveTextContent(/^1/)
    expect(
      screen.getByRole("button", { name: /Who can I contact about privacy\?/ }),
    ).toHaveTextContent(/^18/)
  })

  it("toggles a single question open and closed", () => {
    render(<FAQPage onBack={vi.fn()} />)
    const heading = screen.getByRole("button", { name: /Does Mausam sell my data\?/ })
    fireEvent.click(heading)
    expect(heading).toHaveAttribute("aria-expanded", "true")

    const panel = screen.getByRole("region", { name: /Does Mausam sell my data\?/ })
    expect(panel.textContent).toContain("Mausam does not sell personal information")

    fireEvent.click(heading)
    expect(heading).toHaveAttribute("aria-expanded", "false")
  })

  it("makes the contact address in question 18 a mail link", () => {
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Who can I contact about privacy\?/ }))
    const panel = screen.getByRole("region", { name: /Who can I contact about privacy\?/ })
    const link = within(panel).getByRole("link", { name: FAQ_EMAIL })
    expect(link).toHaveAttribute("href", `mailto:${FAQ_EMAIL}`)
  })

  it("renders no raw markdown syntax anywhere in the document", () => {
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /What is Mausam\?/ }))
    const text = (document.querySelector(".faq-page") as HTMLElement).textContent ?? ""
    expect(text).not.toContain("###")
    expect(text).not.toContain("**")
    expect(text).not.toMatch(/\[Insert/)
    expect(text).not.toMatch(/#\s*\d+\./)
  })

  it("offers a way back to home at the top and to the briefing at the foot of the page", () => {
    const onBack = vi.fn()
    const onHome = vi.fn()
    render(<FAQPage onBack={onBack} onHome={onHome} />)
    const homeButton = screen.getByRole("button", { name: "Back to home" })
    const briefingButton = screen.getByRole("button", { name: "Back to briefing" })
    fireEvent.click(homeButton)
    expect(onHome).toHaveBeenCalledTimes(1)
    fireEvent.click(briefingButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("falls back to onBack when onHome is not provided", () => {
    const onBack = vi.fn()
    render(<FAQPage onBack={onBack} />)
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }))
    expect(onBack).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Back to briefing" }))
    expect(onBack).toHaveBeenCalledTimes(2)
  })
})

describe("FAQ search", () => {
  it("filters questions as you type, case-insensitively", async () => {
    const user = userEvent.setup()
    render(<FAQPage onBack={vi.fn()} />)
    await user.type(search(), "LOCATION")

    const shown = closedQuestions()
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(18)
    for (const question of shown)
      expect(question.textContent?.toLowerCase()).toContain("location")
    expect(
      screen.queryByRole("button", { name: /Does Mausam sell my data\?/ }),
    ).not.toBeInTheDocument()
  })

  it("reports how many questions match, with their numbers", () => {
    render(<FAQPage onBack={vi.fn()} />)
    expect(screen.getByText(/FAQs · 18 questions/)).toBeInTheDocument()
    type("account")
    const breadcrumb = document.querySelector(".faq-breadcrumb") as HTMLElement
    expect(breadcrumb.textContent).toMatch(/FAQs · 1 of 18 questions/)
    expect(breadcrumb.textContent).toMatch(/\(Q17\)/)
  })

  it("shows a no-results message with a working reset", () => {
    render(<FAQPage onBack={vi.fn()} />)
    type("thunderstorm on mars")
    expect(screen.getByText(/No questions match/)).toBeInTheDocument()
    expect(screen.queryAllByRole("region")).toHaveLength(0)

    fireEvent.click(screen.getByRole("button", { name: "Show all questions" }))
    expect(closedQuestions()).toHaveLength(18)
    expect(screen.queryByText(/No questions match/)).not.toBeInTheDocument()
  })
})

describe("FAQ search highlighting", () => {
  it("marks the match and keeps the original casing", () => {
    render(<FAQPage onBack={vi.fn()} />)
    type("mausam")
    const marks = document.querySelectorAll("mark.faq-mark")
    expect(marks.length).toBeGreaterThan(0)
    // The query was lower case; the rendered text keeps the document's case.
    expect([...marks].some((mark) => mark.textContent === "Mausam")).toBe(true)
  })

  it("does not break on regex metacharacters", () => {
    render(<FAQPage onBack={vi.fn()} />)
    // "?" is an invalid RegExp on its own, and every question ends with one.
    expect(() => type("?")).not.toThrow()
    expect(closedQuestions()).toHaveLength(18)
    expect(document.querySelectorAll("mark.faq-mark")).toHaveLength(18)

    // Metacharacters that match nothing must simply yield no results.
    expect(() => type("c++")).not.toThrow()
    expect(screen.getByText(/No questions match/)).toBeInTheDocument()
    expect(() => type("a|b")).not.toThrow()
    expect(() => type("(unclosed")).not.toThrow()
    expect(screen.getByText(/No questions match/)).toBeInTheDocument()
  })

  it("highlights nothing when the search is empty", () => {
    render(<FAQPage onBack={vi.fn()} />)
    expect(document.querySelectorAll("mark.faq-mark")).toHaveLength(0)
  })
})

describe("FAQ keyboard shortcuts", () => {
  it("focuses the search box on Ctrl+K and on Cmd+K", () => {
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.keyDown(document, { key: "k", ctrlKey: true })
    expect(document.activeElement).toBe(search())

    search().blur()
    fireEvent.keyDown(document, { key: "k", metaKey: true })
    expect(document.activeElement).toBe(search())
  })

  it("focuses the search box on / but not while typing", () => {
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.keyDown(document, { key: "/" })
    expect(document.activeElement).toBe(search())

    // A "/" typed into a text field must reach the field, not the shortcut.
    const heading = screen.getByRole("button", { name: /What is Mausam\?/ })
    heading.focus()
    fireEvent.keyDown(search(), { key: "/" })
    expect(document.activeElement).toBe(heading)
  })

  it("clears the search and collapses everything on Escape", () => {
    render(<FAQPage onBack={vi.fn()} />)
    type("location")
    fireEvent.click(screen.getByRole("button", { name: /Does Mausam work without location permission\?/ }))
    expect(openQuestions().length).toBeGreaterThan(0)

    fireEvent.keyDown(document, { key: "Escape" })
    expect(search()).toHaveValue("")
    expect(openQuestions()).toHaveLength(0)
    expect(closedQuestions()).toHaveLength(18)
  })

  it("ignores shortcuts while a modal dialog owns the keyboard", () => {
    render(<FAQPage onBack={vi.fn()} />)
    const dialog = document.createElement("dialog")
    dialog.setAttribute("open", "")
    document.body.append(dialog)

    fireEvent.keyDown(document, { key: "/" })
    expect(document.activeElement).not.toBe(search())

    dialog.remove()
  })
})

describe("FAQ copy to clipboard", () => {
  it("copies the question and its answer, then confirms with a toast", async () => {
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy Q8 to clipboard" }))

    expect(await screen.findByText("Copied Q8 to clipboard")).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledOnce()
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain("8. Does Mausam sell my data?")
    expect(copied).toContain("Mausam does not sell personal information")
    expect(copied).not.toContain("**")
  })

  it("swaps the icon for a tick after a successful copy", async () => {
    render(<FAQPage onBack={vi.fn()} />)
    const button = screen.getByRole("button", { name: "Copy Q1 to clipboard" })
    const before = button.querySelector("path")?.getAttribute("d")
    fireEvent.click(button)
    await screen.findByText("Copied Q1 to clipboard")
    expect(button.querySelector("path")?.getAttribute("d")).not.toBe(before)
  })

  it("reports a clipboard failure instead of claiming success", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"))
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy Q1 to clipboard" }))
    expect(await screen.findByText(/Couldn’t copy/)).toBeInTheDocument()
  })
})

describe("FAQ anchor links", () => {
  it("gives every question a bookmarkable id", () => {
    render(<FAQPage onBack={vi.fn()} />)
    expect(document.getElementById("faq-1")).toBeInTheDocument()
    expect(document.getElementById("faq-18")).toBeInTheDocument()
  })

  it("updates the URL and copies it when the link icon is used", async () => {
    render(<FAQPage onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy link to Q5" }))

    expect(window.location.hash).toBe("#faq-5")
    expect(await screen.findByText("Copied link to Q5")).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(writeText.mock.calls[0][0]).toContain("#faq-5")
  })

  it("copies the link for the focused question when # is pressed", async () => {
    render(<FAQPage onBack={vi.fn()} />)
    const heading = screen.getByRole("button", { name: /Do I have to share my location\?/ })
    heading.focus()
    fireEvent.keyDown(heading, { key: "#" })

    expect(await screen.findByText("Copied link to Q3")).toBeInTheDocument()
    expect(window.location.hash).toBe("#faq-3")
  })

  it("opens the linked question when the page is loaded at an anchor", () => {
    window.history.replaceState(null, "", "#faq-7")
    render(<FAQPage onBack={vi.fn()} />)
    expect(
      screen.getByRole("button", { name: /Does Mausam track me continuously\?/ }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(openQuestions()).toHaveLength(1)
  })
})

describe("FAQ keyboard navigation", () => {
  it("moves between question headings with the arrow keys", () => {
    render(<FAQPage onBack={vi.fn()} />)
    const headings = closedQuestions()
    headings[0].focus()

    fireEvent.keyDown(headings[0], { key: "ArrowDown" })
    expect(document.activeElement).toBe(headings[1])

    fireEvent.keyDown(headings[1], { key: "ArrowDown" })
    expect(document.activeElement).toBe(headings[2])

    fireEvent.keyDown(headings[2], { key: "ArrowUp" })
    expect(document.activeElement).toBe(headings[1])
  })

  it("stops at the ends of the list", () => {
    render(<FAQPage onBack={vi.fn()} />)
    const headings = closedQuestions()
    headings[0].focus()
    fireEvent.keyDown(headings[0], { key: "ArrowUp" })
    expect(document.activeElement).toBe(headings[0])

    const last = headings[headings.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: "ArrowDown" })
    expect(document.activeElement).toBe(last)
  })

  it("moves focus into the answer's first link when a question is opened", async () => {
    render(<FAQPage onBack={vi.fn()} />)
    const heading = screen.getByRole("button", { name: /Who can I contact about privacy\?/ })
    heading.focus()
    fireEvent.keyDown(heading, { key: "Enter" })
    fireEvent.click(heading)

    await vi.waitFor(() =>
      expect(document.activeElement).toHaveAttribute("href", `mailto:${FAQ_EMAIL}`),
    )
  })
})
