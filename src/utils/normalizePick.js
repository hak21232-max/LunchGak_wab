/** 카카오 place_url 또는 place_id에서 숫자 ID 추출 후 장소 상세페이지 URL 생성 */
export function buildKakaoPlaceUrl(pick) {
  const raw = String(pick?.place_url ?? '').trim()

  const fromUrl = raw.match(
    /(?:place\.map\.kakao\.com\/|map\.kakao\.com\/link\/map\/|itemId=)(\d+)/i,
  )
  if (fromUrl) return `https://place.map.kakao.com/${fromUrl[1]}`

  const id = String(pick?.place_id ?? pick?.id ?? '').trim()
  if (/^\d+$/.test(id)) return `https://place.map.kakao.com/${id}`

  return ''
}

export function normalizePick(pick) {
  const lat = Number(pick.lat)
  const lng = Number(pick.lng)
  return {
    ...pick,
    lat: Number.isFinite(lat) ? lat : pick.lat,
    lng: Number.isFinite(lng) ? lng : pick.lng,
    blog_count: pick.blog_count ?? pick.blogMentions ?? 0,
    is_exemplary: Boolean(pick.is_exemplary),
    place_url: buildKakaoPlaceUrl(pick),
  }
}

export function normalizeRecommendResponse(data) {
  if (!data?.picks) return data
  return {
    ...data,
    picks: data.picks.map(normalizePick),
  }
}
