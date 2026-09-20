import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import { OfflineScreen } from "@/components/offline/OfflineScreen"
import { LanguageProvider } from "@/i18n"

describe("OfflineScreen Component", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("renders sleeping state initially with poke hint and zzz elements", () => {
    const onRetry = vi.fn()
    const onDemoMode = vi.fn()

    const { container } = render(
      <LanguageProvider>
        <OfflineScreen onRetry={onRetry} onDemoMode={onDemoMode} theme="light" />
      </LanguageProvider>
    )

    // Verify brand and offline status
    expect(screen.getByText("Mausam")).toBeInTheDocument()
    expect(screen.getByText("Offline")).toBeInTheDocument()

    // Verify zzz particles
    expect(container.querySelector(".zzz-container")).toBeInTheDocument()

    // Verify main container has theme-light and sleeping mascot state
    const main = container.querySelector(".offline-screen")
    expect(main).toHaveClass("theme-light")
    expect(main).toHaveAttribute("data-mascot-state", "sleeping")
  })

  it("triggers wake-up sequence and calls onRetry when mascot is tapped", () => {
    const onRetry = vi.fn()

    const { container } = render(
      <LanguageProvider>
        <OfflineScreen onRetry={onRetry} theme="dark" />
      </LanguageProvider>
    )

    const mascotButton = screen.getByLabelText(/Sleeping weather cloud mascot/i)
    fireEvent.click(mascotButton)

    // Mascot enters startled state immediately
    const main = container.querySelector(".offline-screen")
    expect(main).toHaveAttribute("data-mascot-state", "startled")

    // Advance 450ms for transition to searching and onRetry call
    act(() => {
      vi.advanceTimersByTime(450)
    })

    expect(main).toHaveAttribute("data-mascot-state", "searching")
    expect(onRetry).toHaveBeenCalledTimes(1)

    // Advance 3200ms to allow mascot to curl back to sleep if no reconnect
    act(() => {
      vi.advanceTimersByTime(3200)
    })
    expect(main).toHaveAttribute("data-mascot-state", "sleeping")
  })

  it("triggers wake-up when primary action button is clicked", () => {
    const onRetry = vi.fn()

    const { container } = render(
      <LanguageProvider>
        <OfflineScreen onRetry={onRetry} theme="light" />
      </LanguageProvider>
    )

    const wakeBtn = screen.getByRole("button", { name: /Wake Up & Reconnect|⚡/i })
    fireEvent.click(wakeBtn)

    const main = container.querySelector(".offline-screen")
    expect(main).toHaveAttribute("data-mascot-state", "startled")

    act(() => {
      vi.advanceTimersByTime(450)
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("calls onDemoMode when explore demo mode button is clicked", () => {
    const onRetry = vi.fn()
    const onDemoMode = vi.fn()

    render(
      <LanguageProvider>
        <OfflineScreen onRetry={onRetry} onDemoMode={onDemoMode} theme="light" />
      </LanguageProvider>
    )

    const demoBtn = screen.getByRole("button", { name: /Explore Offline Demo Mode/i })
    fireEvent.click(demoBtn)

    expect(onDemoMode).toHaveBeenCalledTimes(1)
  })

  it("calls onChangeLocation when change location button is clicked", () => {
    const onRetry = vi.fn()
    const onChangeLocation = vi.fn()

    render(
      <LanguageProvider>
        <OfflineScreen onRetry={onRetry} onChangeLocation={onChangeLocation} theme="dark" />
      </LanguageProvider>
    )

    const changeLocBtn = screen.getByRole("button", { name: /Change location/i })
    fireEvent.click(changeLocBtn)

    expect(onChangeLocation).toHaveBeenCalledTimes(1)
  })

  it("reacts to window online event to wake up mascot and retry", () => {
    const onRetry = vi.fn()

    const { container } = render(
      <LanguageProvider>
        <OfflineScreen onRetry={onRetry} theme="light" />
      </LanguageProvider>
    )

    act(() => {
      window.dispatchEvent(new Event("online"))
    })

    const main = container.querySelector(".offline-screen")
    expect(main).toHaveAttribute("data-mascot-state", "startled")

    act(() => {
      vi.advanceTimersByTime(450)
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
