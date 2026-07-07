const STORAGE_KEY = 'lunchgak_excluded_restaurants'
const MAX_COUNT = 100

export const EXCLUDED_CHANGED_EVENT = 'lunchgak:excluded-changed'

function notifyChanged() {
  window.dispatchEvent(new CustomEvent(EXCLUDED_CHANGED_EVENT))
}

function parseList(raw) {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item) => item && typeof item.place_id === 'string' && typeof item.name === 'string',
  )
}

export function loadExcludedRestaurants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return parseList(JSON.parse(raw))
  } catch {
    return []
  }
}

export function getExcludedPlaceIds() {
  return loadExcludedRestaurants().map((item) => String(item.place_id))
}

function saveList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_COUNT)))
  notifyChanged()
}

export function pickToExcludedEntry(pick) {
  return {
    place_id: String(pick.place_id),
    name: pick.name,
    category: pick.category ?? '',
    addedAt: Date.now(),
  }
}

export function addExcludedRestaurant(entry) {
  const id = String(entry.place_id)
  if (!id || !entry.name) return { ok: false, reason: 'invalid' }

  const list = loadExcludedRestaurants()
  if (list.some((item) => String(item.place_id) === id)) {
    return { ok: false, reason: 'duplicate' }
  }

  saveList([{ ...entry, place_id: id, addedAt: entry.addedAt ?? Date.now() }, ...list])
  return { ok: true }
}

export function removeExcludedRestaurants(placeIds) {
  const ids = new Set(placeIds.map(String))
  if (ids.size === 0) return 0

  const list = loadExcludedRestaurants()
  const next = list.filter((item) => !ids.has(String(item.place_id)))
  const removed = list.length - next.length
  if (removed > 0) saveList(next)
  return removed
}

export function isPlaceExcluded(placeId) {
  const id = String(placeId)
  return loadExcludedRestaurants().some((item) => String(item.place_id) === id)
}
