import type { RecommendRequest } from './types'

export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (value != null && value !== '') return [String(value)]
  return []
}

/** 거리 복수 선택 → 가장 넓은 반경 */
export function resolveDistanceLabel(values: string[]): string {
  const joined = values.join(' ')
  if (joined.includes('1000') || joined.includes('1km') || joined.includes('13분')) {
    return '도보 13분 (반경 1km)'
  }
  if (joined.includes('600') || joined.includes('8분')) {
    return '도보 8분 (반경 600m)'
  }
  if (joined.includes('300') || joined.includes('4분')) {
    return '도보 4분 (반경 300m)'
  }
  return values[0] ?? '도보 8분 (반경 600m)'
}

/** 예산 복수 선택 → 가장 넉넉한 구간 */
export function resolveBudgetLabel(values: string[]): string {
  const joined = values.join(' ')
  if (joined.includes('법') || joined.includes('제한')) return '제한 없음 (법인카드)'
  if (joined.includes('1~2')) return '1~2만원'
  if (joined.includes('1만')) return '1만원 이하'
  return values[0] ?? '1~2만원'
}

export function hasSituation(req: RecommendRequest, ...keys: string[]): boolean {
  return keys.some((key) => req.situation.some((s) => s === key || s.includes(key)))
}

export function primarySituation(req: RecommendRequest): string {
  if (hasSituation(req, '회식')) return '회식'
  if (hasSituation(req, '함께')) return '함께'
  return req.situation[0] ?? ''
}

export function formatSituations(req: RecommendRequest): string {
  return req.situation.join('·') || '식사'
}

export function formatMoods(req: RecommendRequest): string {
  return req.mood.join(' + ') || '평범'
}
