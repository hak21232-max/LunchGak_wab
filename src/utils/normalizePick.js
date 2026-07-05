/** 카카오 place_url 또는 place_id에서 숫자 ID 추출 후 공식 링크 생성 */
export function buildKakaoPlaceUrl(pick) {
  const raw = String(pick?.place_url ?? '').trim()

  const fromUrl = raw.match(
    /(?:place\.map\.kakao\.com\/|map\.kakao\.com\/link\/map\/|itemId=)(\d+)/i,
  )
  if (fromUrl) return `https://map.kakao.com/link/map/${fromUrl[1]}`

  const id = String(pick?.place_id ?? pick?.id ?? '').trim()
  if (/^\d+$/.test(id)) return `https://map.kakao.com/link/map/${id}`

  return ''
}

export function normalizePick(pick) {
  return {
    ...pick,
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
