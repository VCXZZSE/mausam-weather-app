// Minimal Markdown reader for the policy documents that ship with the app.
// The privacy policy is authored once as Markdown so the published document
// and the in-app page never drift apart; this turns that text into the
// section tree PrivacyPolicy.tsx renders as collapsible panels.
//
// Deliberately narrow: it supports only what the policy documents use —
// headings, paragraphs (with hard line breaks), bullet lists and **bold**.
// It is not a general-purpose Markdown engine and does not emit raw HTML,
// so nothing in the source can inject markup into the page.

export type InlineToken = { text: string; strong: boolean; href?: string }

export type MarkdownBlock =
  | { kind: "paragraph"; lines: InlineToken[][] }
  | { kind: "list"; items: InlineToken[][] }

export type MarkdownSection = {
  id: string
  heading: string
  blocks: MarkdownBlock[]
}

export type MarkdownDocument = {
  title: string
  intro: MarkdownBlock[]
  sections: MarkdownSection[]
}

// Capturing, so String.split keeps the addresses it matches.
const EMAIL = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/

/** Splits a line into its plain, **bold** and mail-link runs. */
export function parseInline(text: string): InlineToken[] {
  // With balanced markers every odd-indexed part sits between a pair of
  // asterisks; an unpaired marker leaves the line as plain text rather than
  // emphasising the remainder of the document.
  const parts = text.split("**")
  const balanced = parts.length % 2 === 1
  const tokens: InlineToken[] = []
  parts.forEach((part, index) => {
    if (!part) return
    const strong = balanced && index % 2 === 1
    // Contact addresses become mail links so a reader can act on them
    // without copying them out by hand. Splitting on the capturing group
    // leaves the addresses as their own pieces, and nothing else can match.
    for (const piece of part.split(EMAIL)) {
      if (!piece) continue
      if (EMAIL.test(piece)) tokens.push({ text: piece, strong, href: `mailto:${piece}` })
      else tokens.push({ text: piece, strong })
    }
  })
  return tokens
}

const tokensToText = (tokens: InlineToken[]) =>
  tokens.map((token) => token.text).join("")

/** Flattens blocks back to plain text, for copying a section to the clipboard. */
export function blocksToPlainText(blocks: MarkdownBlock[]): string {
  return blocks
    .map((block) =>
      block.kind === "list"
        ? block.items.map((item) => `- ${tokensToText(item)}`).join("\n")
        : block.lines.map(tokensToText).join("\n"),
    )
    .join("\n\n")
}

/**
 * Reads the value out of a `**Label:** value` line, which is how the policy
 * documents carry their effective date, publisher and contact address.
 */
export function findMetaValue(
  blocks: MarkdownBlock[],
  label: string,
): string | null {
  for (const block of blocks) {
    if (block.kind !== "paragraph") continue
    for (const [first, ...rest] of block.lines) {
      if (!first?.strong) continue
      if (first.text.replace(/:\s*$/, "").trim().toLowerCase() !== label.toLowerCase())
        continue
      const value = rest.map((token) => token.text).join("").trim()
      if (value) return value
    }
  }
  return null
}

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function parseMarkdown(source: string): MarkdownDocument {
  const document: MarkdownDocument = { title: "", intro: [], sections: [] }
  let blocks = document.intro
  let paragraph: string[] | null = null
  let list: string[] | null = null
  let hardBreak = false

  const flushParagraph = () => {
    if (paragraph)
      blocks.push({ kind: "paragraph", lines: paragraph.map(parseInline) })
    paragraph = null
    hardBreak = false
  }
  const flushList = () => {
    if (list) blocks.push({ kind: "list", items: list.map(parseInline) })
    list = null
  }
  const flush = () => {
    flushParagraph()
    flushList()
  }

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()

    if (!line) {
      flush()
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      flush()
      const text = heading[2].trim()
      // The single top-level heading titles the document; everything below
      // it opens a section the page can collapse.
      if (heading[1].length === 1 && !document.title) {
        document.title = text
        continue
      }
      const section: MarkdownSection = {
        id: slugify(text),
        heading: text,
        blocks: [],
      }
      document.sections.push(section)
      blocks = section.blocks
      continue
    }

    const item = /^[-*]\s+(.+)$/.exec(line)
    if (item) {
      flushParagraph()
      ;(list ??= []).push(item[1].trim())
      continue
    }

    flushList()
    if (!paragraph) paragraph = [line]
    // Two trailing spaces are a Markdown hard break: the next line starts a
    // new visual row inside the same paragraph instead of wrapping into it.
    else if (hardBreak) paragraph.push(line)
    else paragraph[paragraph.length - 1] += ` ${line}`
    hardBreak = /\s\s$/.test(rawLine)
  }

  flush()
  return document
}
