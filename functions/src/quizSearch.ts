import type { RecommendRequest } from './types'

/** 5문답 → 카카오 키워드 검색 쿼리 (음식종류 중심) */
export function buildQuizSearchQueries(req: RecommendRequest): string[] {
  const queries = new Set<string>()

  if (req.food.some((f) => f.includes('자유'))) {
    queries.add('맛집')
    if (req.situation === '회식') queries.add('회식 맛집')
    if (req.situation === '혼밥') queries.add('혼밥')
    if (req.situation === '함께') queries.add('점심 맛집')
    return [...queries].slice(0, 5)
  }

  for (const food of req.food) {
    if (food.includes('매운')) {
      ;['매운음식', '찌개', '분식', '마라탕', '떡볶이', '제육볶음'].forEach((q) => queries.add(q))
    }
    if (food.includes('국물')) {
      ;['국밥', '칼국수', '설렁탕', '곰탕', '전골'].forEach((q) => queries.add(q))
    }
    if (food.includes('면')) {
      ;['라멘', '칼국수', '우동', '파스타', '냉면'].forEach((q) => queries.add(q))
    }
    if (food.includes('밥')) {
      ;['덮밥', '비빔밥', '볶음밥', '백반', '김밥'].forEach((q) => queries.add(q))
    }
    if (food.includes('가벼')) {
      ;['샐러드', '죽', '비빔밥', '포케'].forEach((q) => queries.add(q))
    }
    if (food.includes('고기')) {
      ;['삼겹살', '고깃집', '갈비', '스테이크'].forEach((q) => queries.add(q))
    }
  }

  if (req.situation === '회식') queries.add('회식')
  if (req.situation === '혼밥') queries.add('혼밥 맛집')
  if (req.situation === '함께') queries.add('점심 맛집')
  if (req.budget.includes('1만')) queries.add('점심특선')

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
