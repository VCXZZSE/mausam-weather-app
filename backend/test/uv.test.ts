import { describe, expect, it } from 'vitest'
import { normalizeUv } from '../src/normalizers/uv.js'

describe('normalizeUv', () => {
  it('categorizes low UV correctly', () => {
    const result = normalizeUv({ currentUvIndex: 1, dailyUvIndexMax: 3 })
    expect(result.label).toBe('Low')
  })

  it('categorizes high UV correctly', () => {
    const result = normalizeUv({ currentUvIndex: 7, dailyUvIndexMax: 8 })
    expect(result.label).toBe('High')
  })

  it('categorizes extreme UV correctly', () => {
    const result = normalizeUv({ currentUvIndex: 12, dailyUvIndexMax: 12 })
    expect(result.label).toBe('Extreme')
  })

  it('clamps negative or invalid index values to zero', () => {
    const result = normalizeUv({ currentUvIndex: -3, dailyUvIndexMax: 0 })
    expect(result.index).toBe(0)
    expect(result.label).toBe('Low')
  })

  it('uses solar noon for peak hours when provided', () => {
    const result = normalizeUv({ currentUvIndex: 6, dailyUvIndexMax: 6, solarNoon: '12:30 PM' })
    expect(result.peakHours).toContain('12:30 PM')
  })

  it('falls back to a default peak window when solar noon is unavailable', () => {
    const result = normalizeUv({ currentUvIndex: 6, dailyUvIndexMax: 6 })
    expect(result.peakHours).toBe('11 AM–2 PM')
  })
})
