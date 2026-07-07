import type { RecommendRequest } from './types'

function collectFoodTerms(req: RecommendRequest): string[] {
  const terms = new Set<string>()

  if (req.food.some((f) => f.includes('자유'))) {
    terms.add('맛집')
    terms.add('고깃집')
    return [...terms]
  }

  for (const food of req.food) {
    if (food.includes('매운')) {
      ;['매운음식', '찌개', '분식', '마라탕', '떡볶이', '제육볶음'].forEach((q) => terms.add(q))
    }
    if (food.includes('국물')) {
      ;['국밥', '칼국수', '설렁탕', '곰탕', '전골'].forEach((q) => terms.add(q))
    }
    if (food.includes('면')) {
      ;['라멘', '칼국수', '우동', '파스타', '냉면'].forEach((q) => terms.add(q))
    }
    if (food.includes('밥')) {
      ;['덮밥', '비빔밥', '볶음밥', '백반', '김밥'].forEach((q) => terms.add(q))
    }
    if (food.includes('가벼')) {
      ;['샐러드', '죽', '비빔밥', '포케'].forEach((q) => terms.add(q))
    }
    if (food.includes('고기')) {
      ;['삼겹살', '고깃집', '갈비', '스테이크'].forEach((q) => terms.add(q))
    }
  }

  return [...terms]
}

/** 1만원 이하 예산 — 카카오 키워드 보강 */
function addBudgetSearchQueries(queries: Set<string>, req: RecommendRequest): void {
  if (!req.budget.includes('1만')) return
  ;['저렴한', '가성비', '만원이하', '점심특선'].forEach((q) => queries.add(q))
}

/** 블로그 검색용 음식 키워드 (회식 조합) */
export function resolveFoodSearchKeyword(req: RecommendRequest): string {
  const vibe = resolvePrimaryFoodVibe(req)
  const map: Record<string, string> = {
    매운: '매운음식',
    국물: '국물',
    면류: '면',
    밥류: '밥',
    고기: '고기',
    가벼운: '가벼운',
    자유: '',
  }
  return map[vibe] ?? vibe
}

/** 네이버 블로그 검색 쿼리 — 일반: 식당명+음식, 회식: 식당명+음식+회식 (고기는 회식 제외) */
export function buildBlogSearchQuery(placeName: string, req: RecommendRequest): string {
  const food = resolveFoodSearchKeyword(req)
  const meatHoesik =
    req.food.some((f) => f.includes('고기')) && !req.food.some((f) => f.includes('자유'))

  if (req.situation === '회식') {
    if (meatHoesik) {
      return food ? `${placeName} ${food}` : placeName
    }
    return food ? `${placeName} ${food} 회식` : `${placeName} 회식`
  }

  return food ? `${placeName} ${food}` : placeName
}

/** 문답 → 카카오 키워드 검색 쿼리 (음식종류 중심) */
export function buildQuizSearchQueries(req: RecommendRequest): string[] {
  const queries = new Set<string>()

  if (req.meal.includes('점심')) {
    queries.add('점심특선')
    queries.add('점심 맛집')
  }
  if (req.meal.includes('저녁')) {
    queries.add('저녁 맛집')
    queries.add('술집')
  }

  addBudgetSearchQueries(queries, req)

  if (req.situation === '회식') {
    const meatHoesik =
      req.food.some((f) => f.includes('고기')) && !req.food.some((f) => f.includes('자유'))
    for (const term of collectFoodTerms(req)) {
      queries.add(meatHoesik ? term : `${term} 회식`)
    }
    if (!meatHoesik) {
      queries.add('회식 맛집')
      queries.add('회식')
    }
    return [...queries].slice(0, 8)
  }

  if (req.food.some((f) => f.includes('자유'))) {
    queries.add('맛집')
    if (req.situation === '혼밥') queries.add('혼밥')
    if (req.situation === '함께') queries.add('점심 맛집')
    return [...queries].slice(0, 5)
  }

  for (const term of collectFoodTerms(req)) {
    queries.add(term)
  }

  if (req.situation === '혼밥') queries.add('혼밥 맛집')
  if (req.situation === '함께') queries.add('점심 맛집')

  return [...queries].slice(0, 8)
}

/** Gemini·검증용 음식 결 라벨 */
export function resolveFoodVibe(req: RecommendRequest): string {
  if (req.food.some((f) => f.includes('자유'))) return '자유 선택'
  return req.food.join(' + ')
}

export function resolvePrimaryFoodVibe(req: RecommendRequest): string {
  const f = req.food.find((x) => !x.includes('자유')) ?? req.food[0] ?? ''
  if (f.includes('매운')) return '매운'
  if (f.includes('국물')) return '국물'
  if (f.includes('면')) return '면류'
  if (f.includes('밥')) return '밥류'
  if (f.includes('고기')) return '고기'
  if (f.includes('가벼')) return '가벼운'
  if (f.includes('자유')) return '자유'
  return f
}
