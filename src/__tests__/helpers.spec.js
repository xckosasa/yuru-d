import { describe, it, expect } from 'vitest'
import { formatWeight, computeBMI, prevDiff, goalDiff } from '../utils/helpers'

describe('helpers', () => {
  it('formats weight', () => {
    expect(formatWeight(64.234)).toBe('64.2')
    expect(formatWeight(null)).toBe('—')
  })

  it('computes BMI', () => {
    expect(computeBMI(64.2, 170)).toBeCloseTo(22.2, 1)
    expect(computeBMI(null, 170)).toBeNull()
  })

  it('computes previous diff', () => {
    expect(prevDiff(64.2, 64.5)).toBeCloseTo(-0.3, 1)
  })

  it('computes goal diff', () => {
    expect(goalDiff(64.2, 60)).toBeCloseTo(-4.2, 1)
    expect(goalDiff(64.2, 70)).toBeCloseTo(5.8, 1)
  })
})
