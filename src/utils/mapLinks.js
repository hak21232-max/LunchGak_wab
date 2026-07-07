function encodeName(name) {
  return encodeURIComponent(String(name ?? '목적지'))
}

/** 카카오맵 도보 길찾기 (출발 → 식당) — 공식: /link/by/walk/출발,lat,lng/도착,lat,lng */
export function kakaoRouteUrl(fromLat, fromLng, toName, toLat, toLng) {
  if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) return ''
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return kakaoPlaceToUrl(toName, toLat, toLng)
  }
  const start = `출발,${fromLat},${fromLng}`
  const dest = `${encodeName(toName)},${toLat},${toLng}`
  return `https://map.kakao.com/link/by/walk/${start}/${dest}`
}

/** 카카오맵 목적지 안내 */
export function kakaoPlaceToUrl(name, lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  return `https://map.kakao.com/link/to/${encodeName(name)},${lat},${lng}`
}

/** 네이버맵 도보 길찾기 */
export function naverWalkRouteUrl(fromLat, fromLng, toName, toLat, toLng) {
  if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) return ''
  const dest = `${toLng},${toLat},${encodeName(toName)},,`
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return `https://map.naver.com/v5/directions/-/${dest}/-/walk`
  }
  const start = `${fromLng},${fromLat},,`
  return `https://map.naver.com/v5/directions/${start}/${dest}/-/walk`
}

export function openExternal(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
