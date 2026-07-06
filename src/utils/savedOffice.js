const OFFICE_KEY = 'lunchgak_office'
const MODE_KEY = 'lunchgak_location_mode'

export function loadSavedOffice() {
  try {
    const raw = localStorage.getItem(OFFICE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null
    return {
      lat: data.lat,
      lng: data.lng,
      label: data.label ?? '회사',
      savedAt: data.savedAt ?? null,
    }
  } catch {
    return null
  }
}

export function saveOfficeLocation(lat, lng, label = '회사') {
  const office = {
    lat,
    lng,
    label,
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(OFFICE_KEY, JSON.stringify(office))
  localStorage.setItem(MODE_KEY, 'office')
  return office
}

export function loadLocationMode() {
  const mode = localStorage.getItem(MODE_KEY)
  return mode === 'office' || mode === 'gps' ? mode : null
}

export function setLocationMode(mode) {
  localStorage.setItem(MODE_KEY, mode)
}

export function clearSavedOffice() {
  localStorage.removeItem(OFFICE_KEY)
  localStorage.setItem(MODE_KEY, 'gps')
}
