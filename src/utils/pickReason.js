/** 카테고리·거리·블로그만 반복하거나, 식당마다 똑같은 템플릿 문구 */
export function isMetadataReason(text) {
  if (!text?.trim()) return true
  if (/음식점\s*>/.test(text) && /도보\s*\d+분/.test(text)) return true
  if (/조건에\s*맞고\s*도보/.test(text) || /오늘\s*pick/.test(text)) return true
  return false
}

/** 블로그·웨이팅 등 범용 tip (코멘트 칸에 넣지 않음) */
export function isGenericTip(text) {
  if (!text?.trim()) return true
  return /블로그\s*언급|웨이팅\s*있을\s*수/.test(text)
}

/** Gemini가 쓴 "이 식당을 고른 이유" 한 줄 */
export function getPickComment(pick) {
  const reason = pick.reason?.trim()
  if (reason && !isMetadataReason(reason)) return reason

  // API reason이 비었거나 메타데이터일 때 tip이 실질적 선정 이유면 사용
  const tip = pick.tip?.trim()
  if (tip && !isMetadataReason(tip) && !isGenericTip(tip)) return tip

  return null
}

export function shouldShowTip(pick, comment) {
  const tip = pick.tip?.trim()
  if (!tip || tip === comment) return false
  if (isMetadataReason(tip)) return false
  return !isGenericTip(tip)
}
