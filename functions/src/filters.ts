import type { KakaoPlace, RecommendRequest } from './types'
import { foodMatchScore, isEligibleMealPlace, parseRadiusMeters } from './kakao'

const NEUTRAL_MOODS = new Set([
  '기분이 좋고 에너지가 넘치는 상태',
  '특별한 감정 없이 평범한 상태',
])

const MOOD_KEYWORDS: Record<string, string[]> = {
  '스트레스가 심한 상태': ['매운', '마라', '짬뽕', '떡볶', '볶음', '쭈꾸미', '낙지', '찌개', '탕'],
  '몸이 많이 피곤한 상태': ['국밥', '찌개', '탕', '곰탕', '국수', '칼국수', '죽', '전골', '우동', '라멘'],
  '몸이 좋지 않고 컨디션이 안 좋은 상태': [
    '죽',
    '국수',
    '백반',
    '쌀',
    '샐러드',
    '비빔',
    '냉면',
    '초밥',
    '포',
  ],
}

const MOOD_EXCLUDED: Record<string, string[]> = {
  '몸이 좋지 않고 컨디션이 안 좋은 상태': [
    '고깃',
    '삼겹',
    '곱창',
    '대창',
    '튀김',
    '주점',
    '호프',
    '술집',
    '마라',
  ],
}

type FilterLevel = 'strict' | 'relaxed' | 'core'

function placeText(place: KakaoPlace): string {
  return `${place.category_name} ${place.place_name}`
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

/** Q1 자리 — 상황·식사 가능 업종 */
function passesSituationFilter(place: KakaoPlace, req: RecommendRequest): boolean {
  if (!isEligibleMealPlace(place.category_name, req.situation, req.time)) {
    return false
  }

  const category = place.category_name

  if (req.situation === '회식') {
    return matchesKeywords(category, [
      '고기',
      '고깃',
      '삼겹',
      '갈비',
      '주점',
      '호프',
      '술집',
      '한정식',
      '회',
      '육',
      '이자카야',
      '포장마차',
    ])
  }

  if (req.situation === '혼밥') {
    if (matchesKeywords(category, ['한정식', '오마카세', '코스', '파인'])) return false
  }

  if (req.situation === '팀점심') {
    if (matchesKeywords(category, ['오마카세', '코스'])) return false
  }

  return true
}

/** Q2 기분 */
function passesMoodFilter(place: KakaoPlace, mood: string): boolean {
  const text = placeText(place)

  const excluded = MOOD_EXCLUDED[mood]
  if (excluded && matchesKeywords(text, excluded)) return false

  if (NEUTRAL_MOODS.has(mood)) return true

  const keywords = MOOD_KEYWORDS[mood]
  if (!keywords) return true

  return matchesKeywords(text, keywords)
}

/** Q3 음식 */
function passesFoodFilter(place: KakaoPlace, foodPrefs: string[]): boolean {
  if (foodPrefs.some((pref) => pref.includes('자유'))) return true
  return foodMatchScore(place.category_name, foodPrefs, place.place_name) > 0
}

/** Q4 시간 — 반경 내 거리 */
function passesTimeFilter(place: KakaoPlace, time: string): boolean {
  const distanceM = Number(place.distance)
  if (Number.isNaN(distanceM)) return true
  return distanceM <= parseRadiusMeters(time)
}

/** Q5 예산 */
function passesBudgetFilter(place: KakaoPlace, budget: string): boolean {
  const category = place.category_name

  if (budget.includes('1만원 이하')) {
    return !matchesKeywords(category, ['스테이크', '오마카세', '한정식', '코스', '파인', '고급'])
  }

  if (budget.includes('1~2만')) {
    return !matchesKeywords(category, ['오마카세', '코스', '파인'])
  }

  return true
}

function passesQuizFilters(
  place: KakaoPlace,
  req: RecommendRequest,
  level: FilterLevel,
): boolean {
  if (!passesSituationFilter(place, req)) return false
  if (!passesTimeFilter(place, req.time)) return false
  if (!passesBudgetFilter(place, req.budget)) return false

  if (level === 'core') return true

  if (!passesFoodFilter(place, req.food)) return false
  if (level === 'relaxed') return true

  return passesMoodFilter(place, req.mood)
}

/** 5문항 답변으로 후보 필터 (엄격 → 완화 순) */
export function filterCandidatesByQuiz(
  places: KakaoPlace[],
  req: RecommendRequest,
): KakaoPlace[] {
  for (const level of ['strict', 'relaxed', 'core'] as FilterLevel[]) {
    const filtered = places.filter((place) => passesQuizFilters(place, req, level))
    if (filtered.length > 0) return filtered
  }

  return []
}
