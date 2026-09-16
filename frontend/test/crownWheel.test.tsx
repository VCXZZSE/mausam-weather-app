import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import App, { SemiCircleCrownWheel, USER_PERSONAS, getPersonaById } from "../src/App"

afterEach(cleanup)

describe("User Personas & Rotating Crown Wheel", () => {
  it("defines all 8 user personas with complete domain specifications", () => {
    expect(USER_PERSONAS).toHaveLength(8)
    const ids = USER_PERSONAS.map((p) => p.id)
    expect(ids).toEqual([
      "health",
      "fitness",
      "beach",
      "travel",
      "family",
      "garden",
      "commute",
      "event",
    ])

    const health = getPersonaById("health")!
    expect(health.title).toBe("Health-conscious")
    expect(health.description).toContain("Air Quality Index (AQI)")
    expect(health.description).toContain("pollen count")
    expect(health.description).toContain("UV index")
    expect(health.description).toContain("humidity levels")

    const fitness = getPersonaById("fitness")!
    expect(fitness.title).toBe("Outdoor fitness enthusiasts")
    expect(fitness.description).toContain("sunrise/sunset times")
    expect(fitness.description).toContain("best running hours")
    expect(fitness.description).toContain("wind speed")
    expect(fitness.description).toContain("heat alerts")

    const beach = getPersonaById("beach")!
    expect(beach.title).toBe("Beachgoers & surfers")
    expect(beach.description).toContain("sea conditions")
    expect(beach.description).toContain("tide timings")
    expect(beach.description).toContain("wave height")
    expect(beach.description).toContain("water temperature")

    const travel = getPersonaById("travel")!
    expect(travel.title).toBe("Travelers")
    expect(travel.description).toContain("saved destinations")
    expect(travel.description).toContain("severe weather alerts for flights")
    expect(travel.description).toContain("packing suggestions")

    const family = getPersonaById("family")!
    expect(family.title).toBe("Parents & families")
    expect(family.description).toContain("school commute conditions")
    expect(family.description).toContain("rain alerts")
    expect(family.description).toContain("severe weather warnings")

    const garden = getPersonaById("garden")!
    expect(garden.title).toBe("Agriculture & gardeners")
    expect(garden.description).toContain("soil moisture")
    expect(garden.description).toContain("rainfall predictions")
    expect(garden.description).toContain("frost alerts")
    expect(garden.description).toContain("seasonal planting guidance")

    const commute = getPersonaById("commute")!
    expect(commute.title).toBe("Commuters")
    expect(commute.description).toContain("traffic updates")
    expect(commute.description).toContain("visibility conditions")
    expect(commute.description).toContain("alerts for sudden storms")

    const event = getPersonaById("event")!
    expect(event.title).toBe("Event planners")
    expect(event.description).toContain("Extended forecasts")
    expect(event.description).toContain("probability of rain")
    expect(event.description).toContain("comfort index")
  })

  it("renders SemiCircleCrownWheel and handles swipe, keyboard navigation and direct selection", () => {
    const onSelect = vi.fn()
    render(
      <SemiCircleCrownWheel
        personas={USER_PERSONAS}
        selectedIndex={0}
        onSelect={onSelect}
      />
    )

    const wheel = screen.getByRole("listbox", { name: /user profile crown wheel/i })
    expect(wheel).toBeInTheDocument()

    // Keyboard ArrowDown navigates
    fireEvent.keyDown(wheel, { key: "ArrowDown" })
    expect(onSelect).toHaveBeenCalledWith(1)

    // Option click directly selects
    const fitnessOption = screen.getByRole("option", { name: /outdoor fitness enthusiasts/i })
    fireEvent.click(fitnessOption)
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it("supports full onboarding through redesigned step 4 with crown profile selection", () => {
    localStorage.clear()
    render(<App />)

    // Welcome step -> start profile
    const startBtn = screen.getByRole("button", { name: /start your profile/i })
    fireEvent.click(startBtn)

    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), {
      target: { value: "Aarav Sen" },
    })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    // Step 2: DOB & Gender
    expect(screen.getByText(/02 \/ YOUR BASELINE/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /save baseline/i }))

    // Step 3: Sensitivities
    expect(screen.getByText(/03 \/ YOUR RESPONSE/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /tune my alerts/i }))

    // Step 4: Redesigned Minimal Crown Wheel Profile Selection
    expect(screen.getByText(/04 \/ CHOOSE YOUR PROFILE/i)).toBeInTheDocument()
    expect(screen.getByText(/how do you experience/i)).toBeInTheDocument()
    expect(screen.getByRole("listbox", { name: /user profile crown wheel/i })).toBeInTheDocument()

    // Active profile summary shows Health-conscious
    expect(screen.getAllByText("Health-conscious").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Allergy, asthma & skin shield/i)).toBeInTheDocument()

    // Select Outdoor Fitness by clicking it
    const fitnessOption = screen.getByRole("option", { name: /outdoor fitness enthusiasts/i })
    fireEvent.click(fitnessOption)

    // Click continue to complete profile
    const continueBtn = screen.getByRole("button", { name: /continue/i })
    fireEvent.click(continueBtn)

    // Verify profile is stored in localStorage with chosen persona
    const stored = JSON.parse(localStorage.getItem("mausam-profile") || "{}")
    expect(stored.name).toBe("Aarav Sen")
    expect(stored.persona).toBe("fitness")
  })
})
