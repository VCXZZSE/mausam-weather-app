// Approximate Indian meteorological seasons, used to select curated
// pollen/garden/event content. This is a coarse calendar classification,
// not a live meteorological determination.
export type IndiaSeason = 'Winter' | 'Summer' | 'Monsoon' | 'Post-Monsoon'

export function getIndiaSeason(month: number): IndiaSeason {
  if (month === 11 || month === 0 || month === 1) return 'Winter'
  if (month >= 2 && month <= 4) return 'Summer'
  if (month >= 5 && month <= 8) return 'Monsoon'
  return 'Post-Monsoon'
}
