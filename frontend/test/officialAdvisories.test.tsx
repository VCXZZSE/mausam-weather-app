import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { LiveOfficialAdvisories as OfficialAdvisories } from "@/components/advisories/OfficialAdvisories"
import type { UserLocation } from "@/services/locationService"

const location: UserLocation = { latitude: 22.57, longitude: 88.36, postalCode: "700001", locality: "Kolkata", region: "West Bengal", country: "India", timezone: "Asia/Kolkata", source: "manual" }
const nextLocation = { ...location, locality: "Mumbai", latitude: 19.07, longitude: 72.87, postalCode: "400001" }
const makeAlert = (id: string, severity = "moderate", expiresAt = new Date(Date.now() + 3600_000).toISOString()) => ({ id, title: `Government warning ${id}`, description: "Official bulletin description", instruction: "Official action advice", area: "Kolkata district", source: "IMD", url: "https://mausam.imd.gov.in/", issuedAt: new Date().toISOString(), expiresAt, severity })
const payload = (status = "available", alerts: ReturnType<typeof makeAlert>[] = [], farming: ReturnType<typeof makeAlert>[] = []) => ({ checkedAt: new Date().toISOString(), categories: { general: { status, alerts }, farming: { status, alerts: farming }, fishing: { status, alerts: [] } } })
const reply = (data: ReturnType<typeof payload>) => ({ ok: true, json: async () => data }) as Response

beforeEach(() => { vi.stubEnv("VITE_WEATHER_API_URL", ""); vi.stubEnv("VITE_ADVISORIES_API_URL", "") })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })

describe("Official advisories tile", () => {
  it("shows verified empty states in all three categories and queries the pincode and coordinates", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(payload()))
    vi.stubGlobal("fetch", fetcher)
    render(<OfficialAdvisories location={location} specialties={["farming", "fishing"]} />)
    expect(await screen.findByText("No active general alerts")).toBeInTheDocument()
    expect(screen.getByText("No farming advisory today")).toBeInTheDocument()
    expect(screen.getByText("No fishing advisory today")).toBeInTheDocument()
    const url = fetcher.mock.calls[0][0] as URL
    expect(url.pathname).toBe("/api/advisories")
    expect(url.searchParams.get("postalCode")).toBe("700001")
    expect(url.searchParams.get("latitude")).toBe("22.57")
  })

  it("shows a reader only their own sector bulletin, and the general one always", async () => {
    // A crop advisory is noise to a commuter and a marine one is noise to
    // anyone not on the water, so a persona sees only its own sector — or
    // neither. This cannot hide a life-safety warning: the backend files a
    // bulletin under farming/fishing only when its own title says so, which
    // makes a cyclone or rainfall warning always "general".
    const data = reply(payload("available", [makeAlert("general")], [makeAlert("farm")]))
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(data))

    const farmer = render(<OfficialAdvisories location={location} specialties={["farming"]} />)
    expect(await screen.findByText("Government warning general")).toBeInTheDocument()
    expect(screen.getByText("Farming")).toBeInTheDocument()
    expect(screen.queryByText("Fishing")).not.toBeInTheDocument()
    farmer.unmount()

    const fisher = render(<OfficialAdvisories location={location} specialties={["fishing"]} />)
    expect(await screen.findByText("Government warning general")).toBeInTheDocument()
    expect(screen.getByText("Fishing")).toBeInTheDocument()
    expect(screen.queryByText("Farming")).not.toBeInTheDocument()
    fisher.unmount()

    // Everyone else: no sector rows at all, but the general block stays.
    const other = render(<OfficialAdvisories location={location} specialties={[]} />)
    expect(await screen.findByText("Government warning general")).toBeInTheDocument()
    expect(other.container.querySelector(".official-specialties")).toBeNull()
    expect(other.container.querySelector(".official-general")).not.toBeNull()
  })

  it("never reports no advisories when official sources are unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(payload("unavailable"))))
    render(<OfficialAdvisories location={location} specialties={["farming", "fishing"]} />)
    expect(await screen.findByText("Official updates unavailable")).toBeInTheDocument()
    expect(screen.getAllByText("Updates unavailable")).toHaveLength(2)
    expect(screen.queryByText(/No .*advisory today/)).not.toBeInTheDocument()
  })

  it("shows the highest severity first and expands the real government bulletins", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(payload("available", [makeAlert("minor", "minor"), makeAlert("severe", "severe")], [makeAlert("farm")]))))
    render(<OfficialAdvisories location={location} specialties={["farming", "fishing"]} />)
    await screen.findByText("Government warning severe")
    expect(screen.getByText("Government warning severe").closest("details")).toBeNull()
    const more = screen.getByText("1 more alert for your area")
    expect(more.closest("details")).not.toHaveAttribute("open")
    fireEvent.click(more)
    expect(more.closest("details")).toHaveAttribute("open")
    // A sector bulletin only renders for the persona whose sector it is, so
    // when one is there it is already open rather than hidden behind a tap.
    const farming = screen.getByText("Farming").closest("summary")!
    expect(farming.closest("details")).toHaveAttribute("open")
    expect(screen.getByText("Government warning farm")).toBeVisible()
    expect(screen.getAllByRole("link", { name: /View official bulletin/ })[0]).toHaveAttribute("href", "https://mausam.imd.gov.in/")
    expect(screen.getAllByText(/Valid until/).length).toBeGreaterThan(0)
  })

  it("clears old-location data immediately and ignores an aborted response racing the new location", async () => {
    let resolveOld!: (response: Response) => void
    let resolveNew!: (response: Response) => void
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveNew = resolve }))
    vi.stubGlobal("fetch", fetcher)
    const view = render(<OfficialAdvisories location={location} />)
    view.rerender(<OfficialAdvisories location={nextLocation} />)
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true)
    expect(screen.getByText("Checking official alerts…")).toBeInTheDocument()
    await act(async () => { resolveNew(reply(payload())) })
    await screen.findByText("No active general alerts")
    await act(async () => { resolveOld(reply(payload("available", [makeAlert("old Kolkata")]))); })
    expect(screen.queryByText("Government warning old Kolkata")).not.toBeInTheDocument()
    expect(screen.getByText("Mumbai · 400001")).toBeInTheDocument()
  })

  it("removes a bulletin at expiry without declaring all clear before a fresh update", async () => {
    vi.useFakeTimers()
    const expiresAt = new Date(Date.now() + 30_000).toISOString()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(payload("available", [makeAlert("expiring", "severe", expiresAt)]))))
    render(<OfficialAdvisories location={location} />)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(screen.getByText("Government warning expiring")).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(screen.queryByText("Government warning expiring")).not.toBeInTheDocument()
    expect(screen.getByText("Official updates unavailable")).toBeInTheDocument()
    expect(screen.queryByText("No active general alerts")).not.toBeInTheDocument()
  })

  it("treats malformed responses as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    render(<OfficialAdvisories location={location} />)
    await waitFor(() => expect(screen.getByText("Official updates unavailable")).toBeInTheDocument())
  })
})
