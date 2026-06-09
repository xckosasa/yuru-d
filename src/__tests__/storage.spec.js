import { describe, it, expect, beforeEach } from 'vitest'
import { loadSettingsFromLS, saveSettingsToLS, loadRecordsFromLS, saveRecordsToLS, addOrReplaceRecord } from '../utils/storage'

beforeEach(() => {
  if (typeof localStorage !== 'undefined' && localStorage.clear) localStorage.clear()
})

describe('storage utils', () => {
  it('saves and loads settings', () => {
    const s = { height: 170, goal: 60, time: '07:30' }
    saveSettingsToLS(s)
    const loaded = loadSettingsFromLS()
    expect(loaded.height).toBe(170)
    expect(loaded.goal).toBe(60)
    expect(loaded.time).toBe('07:30')
  })

  it('saves and loads records and addOrReplaceRecord works', () => {
    const r1 = { date: '2026-06-08', weight: 64.2, fat: 18.5, note: '' }
    const r2 = { date: '2026-06-07', weight: 64.5, fat: 18.8, note: '' }

    let arr = []
    arr = addOrReplaceRecord(arr, r1)
    arr = addOrReplaceRecord(arr, r2)
    expect(arr[0].date).toBe('2026-06-08')
    // replace r2
    const r2b = { ...r2, weight: 64.0 }
    arr = addOrReplaceRecord(arr, r2b)
    expect(arr.find(x => x.date === '2026-06-07').weight).toBe(64.0)

    saveRecordsToLS(arr)
    const loaded = loadRecordsFromLS()
    expect(loaded.length).toBe(2)
  })
})
