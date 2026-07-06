/** 카테고리·거리·블로그만 반복하는 기계적 문구인지 판별 */
export function isMetadataReason(text) {
  if (!text?.trim()) return true
  if (/음식점\s*>/.test(text) && /도보\s*\d+분/.test(text)) return true
  return false
}

/** Gemini가 쓴 "이 식당을 고른 이유" 한 줄 (메타데이터 문구는 제외) */
export function getPickComment(pick) {
  if (pick.reason && !isMetadataReason(pick.reason)) return pick.reason
  return null
}
