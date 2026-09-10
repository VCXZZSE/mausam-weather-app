import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { ProfileSidebar } from "../src/ProfileSidebar"
import type { Profile } from "../src/App"

const profile: Profile = { name: "Aditi Roy", gender: "Female", age: 29, height: 168, weight: 64, activity: "Moderate", goals: ["Fitness"], sensitivities: ["Heat"], concerns: ["Allergies"] }
const location = { latitude: 22.5, longitude: 88.3, locality: "Kolkata", region: "West Bengal", country: "India", timezone: "Asia/Kolkata", postalCode: "700150", source: "manual" as const }
function props() { return { open: true, profile, location, theme: "light" as const, onClose: vi.fn(), onChangeLocation: vi.fn(), onLogout: vi.fn(), onBriefing: vi.fn(), onPrivacy: vi.fn(), onFaq: vi.fn() } }
afterEach(cleanup)

describe("profile sidebar", () => {
  it.each(["Female", "Male", undefined] as const)("shows saved profile details and the appropriate avatar for %s", gender => {
    render(<ProfileSidebar {...props()} profile={{ ...profile, gender }} />)
    const drawer = screen.getByRole("dialog", { name: "Aditi Roy" })
    expect(within(drawer).getByRole("img", { name: gender ? `${gender} profile avatar` : "Neutral profile avatar" })).toBeInTheDocument()
    for (const value of ["29", "168", "64", "Moderate", gender ?? "Not shared"]) expect(within(drawer).getByText(value)).toBeInTheDocument()
    fireEvent.click(screen.getByText("Your preferences"))
    for (const value of ["Fitness", "Heat", "Allergies"]) expect(within(drawer).getByText(value)).toBeVisible()
    expect(screen.getByText("Kolkata · 700150")).toBeInTheDocument()
  })

  it("connects location, briefing and logout controls", () => {
    const handlers = props()
    render(<ProfileSidebar {...handlers} />)
    fireEvent.click(screen.getByRole("button", { name: /Change location/ }))
    fireEvent.click(screen.getByRole("button", { name: /Your daily briefing/ }))
    fireEvent.click(screen.getByRole("button", { name: /Privacy policy/ }))
    fireEvent.click(screen.getByRole("button", { name: /FAQs & help/ }))
    fireEvent.click(screen.getByRole("button", { name: "Log out" }))
    expect(handlers.onChangeLocation).toHaveBeenCalledOnce()
    expect(handlers.onBriefing).toHaveBeenCalledOnce()
    expect(handlers.onPrivacy).toHaveBeenCalledOnce()
    expect(handlers.onFaq).toHaveBeenCalledOnce()
    expect(handlers.onLogout).toHaveBeenCalledOnce()
  })

  it("handles native Escape cancellation and backdrop click without closing on content clicks", () => {
    const handlers = props()
    render(<ProfileSidebar {...handlers} />)
    fireEvent.click(screen.getByText("Your profile"))
    expect(handlers.onClose).not.toHaveBeenCalled()
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }))
    fireEvent.click(screen.getByRole("dialog"))
    expect(handlers.onClose).toHaveBeenCalledTimes(2)
  })

  it("restores focus and scrolling on close", () => {
    const trigger = document.createElement("button")
    document.body.append(trigger)
    trigger.focus()
    const handlers = props()
    const view = render(<ProfileSidebar {...handlers} />)
    expect(document.body.style.overflow).toBe("hidden")
    view.rerender(<ProfileSidebar {...handlers} open={false} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe("")
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
