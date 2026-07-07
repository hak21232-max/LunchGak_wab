function toCoord(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizePlaceId(placeId) {
  const id = String(placeId ?? '').trim()
  return /^\d+$/.test(id) ? id : null
}

/** 한국 좌표 대략 범위 (WGS84) */
function isValidCoord(lat, lng) {
  return lat != null && lng != null && lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132
}

function sanitizePlaceName(name) {
  return String(name ?? '목적지')
    .replace(/[,/\\#?&=]/g, ' ')
    .trim() || '목적지'
}

/**
 * 카카오맵 도보 길찾기
 * @see https://apis.map.kakao.com/web/guide/#routeurl
 * place_id 있으면 목적지 ID 사용 (가장 안정적)
 */
export function kakaoRouteUrl(fromLat, fromLng, toName, toLat, toLng, placeId) {
  const pid = normalizePlaceId(placeId)
  const fLat = toCoord(fromLat)
  const fLng = toCoord(fromLng)
  const tLat = toCoord(toLat)
  const tLng = toCoord(toLng)
  const hasFrom = isValidCoord(fLat, fLng)

  if (pid && hasFrom) {
    return `https://map.kakao.com/link/by/walk/출발,${fLat},${fLng}/${pid}`
  }

  if (pid) {
    return `https://map.kakao.com/link/to/${pid}`
  }

  if (!isValidCoord(tLat, tLng)) return ''

  const dest = `${sanitizePlaceName(toName)},${tLat},${tLng}`

  if (hasFrom) {
    return `https://map.kakao.com/link/from/출발,${fLat},${fLng}/to/${dest}`
  }

  return kakaoPlaceToUrl(toName, tLat, tLng, placeId)
}

/** 카카오맵 목적지 안내 */
export function kakaoPlaceToUrl(name, lat, lng, placeId) {
  const pid = normalizePlaceId(placeId)
  if (pid) return `https://map.kakao.com/link/to/${pid}`

  const tLat = toCoord(lat)
  const tLng = toCoord(lng)
  if (!isValidCoord(tLat, tLng)) return ''

  return `https://map.kakao.com/link/to/${sanitizePlaceName(name)},${tLat},${tLng}`
}

/** 네이버맵 도보 길찾기 */
export function naverWalkRouteUrl(fromLat, fromLng, toName, toLat, toLng) {
  const tLat = toCoord(toLat)
  const tLng = toCoord(toLng)
  if (!isValidCoord(tLat, tLng)) return ''

  const dest = `${tLng},${tLat},${encodeURIComponent(sanitizePlaceName(toName))},,`
  const fLat = toCoord(fromLat)
  const fLng = toCoord(fromLng)

  if (!isValidCoord(fLat, fLng)) {
    return `https://map.naver.com/v5/directions/-/${dest}/-/walk`
  }

  const start = `${fLng},${fLat},,`
  return `https://map.naver.com/v5/directions/${start}/${dest}/-/walk`
}

export function openExternal(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
