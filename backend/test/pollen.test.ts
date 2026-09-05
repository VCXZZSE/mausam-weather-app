import { describe, expect, it } from 'vitest'
import { computePollen } from '../src/data/pollenSeasonalTable.js'

describe('computePollen', () => {
  it('is deterministic for the same month', () => {
    const first = computePollen(3)
    const second = computePollen(3)
    expect(first).toEqual(second)
  })

  it('returns exactly 3 items with valid levels and colors', () => {
    const result = computePollen(0)
    expect(result.items).toHaveLength(3)
    result.items.forEach(item => {
      expect(['Low', 'Moderate', 'High']).toContain(item.level)
      expect(item.percent).toBeGreaterThanOrEqual(0)
      expect(item.percent).toBeLessThanOrEqual(100)
      expect(item.color).toMatch(/^#/)
    })
  })

  it('produces lower pollen during peak monsoon months than pre-monsoon summer', () => {
    const monsoon = computePollen(6) // July
    const summer = computePollen(2) // March
    expect(monsoon.items.find(i => i.type === 'Tree')!.percent)
      .toBeLessThan(summer.items.find(i => i.type === 'Tree')!.percent)
  })

  it('raises weed pollen in the post-monsoon months', () => {
    const postMonsoon = computePollen(10) // November
    expect(postMonsoon.items.find(i => i.type === 'Weed')!.level).toBe('High')
  })

  it('wraps month indices safely (e.g. 12 behaves like January)', () => {
    expect(computePollen(12)).toEqual(computePollen(0))
    expect(computePollen(-1)).toEqual(computePollen(11))
  })

  it('never claims to be a live measurement in its advice text', () => {
    const result = computePollen(5)
    expect(result.advice.toLowerCase()).not.toContain('live')
    expect(result.advice.toLowerCase()).not.toContain('measured')
  })
})
