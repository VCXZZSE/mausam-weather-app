// STATIC CURATED DATA — no geocoding or maps API. Distances and offsets
// are approximate, fixed reference values for well-known West Bengal
// locations relative to Kolkata; they are not live-queried.
export type StaticLocation = {
  name: string
  distance: string
  // Approximate typical temperature difference from Kolkata (curated
  // regional climate knowledge, e.g. Darjeeling's hill-station climate —
  // NOT an independently measured reading for that location).
  temperatureOffset: number
}

export const STATIC_LOCATIONS: StaticLocation[] = [
  { name: 'Darjeeling', distance: '600 km', temperatureOffset: -15 },
  { name: 'Digha Beach', distance: '180 km', temperatureOffset: -2 },
  { name: 'Sundarbans', distance: '130 km', temperatureOffset: -1 },
  { name: 'Siliguri', distance: '570 km', temperatureOffset: -6 },
]
