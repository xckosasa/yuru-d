const LS_SETTINGS = 'yurutto-settings'
const LS_RECORDS = 'yurutto-records'

const storageAPI = (typeof localStorage !== 'undefined')
  ? localStorage
  : (function () {
      let store = {}
      return {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
        },
        setItem(key, val) {
          store[key] = String(val)
        },
        removeItem(key) {
          delete store[key]
        },
        clear() {
          store = {}
        }
      }
    })()

export function loadSettingsFromLS() {
  try {
    const raw = storageAPI.getItem(LS_SETTINGS)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return { height: null, goal: null, time: '', privateMode: false, darkMode: true }
}

export function saveSettingsToLS(settings) {
  storageAPI.setItem(LS_SETTINGS, JSON.stringify(settings))
}

export function loadRecordsFromLS() {
  try {
    const raw = storageAPI.getItem(LS_RECORDS)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return []
}

export function saveRecordsToLS(records) {
  storageAPI.setItem(LS_RECORDS, JSON.stringify(records))
}

export function clearRecordsFromLS() {
  storageAPI.removeItem(LS_RECORDS)
}

export function addOrReplaceRecord(records, entry) {
  const copy = Array.isArray(records) ? records.slice() : []
  const idx = copy.findIndex(r => r.date === entry.date)
  if (idx >= 0) copy.splice(idx, 1, entry)
  else copy.push(entry)
  copy.sort((a, b) => (a.date < b.date ? 1 : -1))
  return copy
}
