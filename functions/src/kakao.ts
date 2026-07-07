import type { KakaoPlace } from './types'

const FOOD_KEYWORDS: Record<string, string[]> = {
  '매운 음식': ['마라', '짬뽕', '떡볶', '매운', '얼큰', '쭈꾸미', '낙지', '찌개', '볶음', '청양'],
  '따뜻하고 든든한 국물 음식': ['국밥', '국수', '칼국수', '쌀국수', '우동', '라멘', '전골', '찌개', '탕', '곰탕'],
  '가볍고 깔끔한 음식': ['샐러드', '죽', '비빔', '냉면', '초밥', '회', '포케', '백반', '국수'],
  '고기류(삼겹살·갈비·스테이크 등)': ['고기', '삼겹', '갈비', '스테이크', '육', '숯불', '곱창', '대창', '족발', '보쌈'],
  '면 요리(라멘·칼국수·파스타 등)': ['면', '라멘', '칼국수', '파스타', '우동', '쌀국수', '짜장', '짬뽕', '냉면'],
  '밥·덮밥·비빔밥 등': ['밥', '덮밥', '비빔밥', '볶음밥', '김밥', '백반', '제육덮밥', '오므라이스', '돈부리'],
}

const ALWAYS_EXCLUDED = [
  '편의점',
  '마트',
  '슈퍼',
  '주유소',
  '약국',
  '병원',
  '미용',
  '세탁',
  '농수산물',
  '정육점',
]

const SNACK_DESSERT_KEYWORDS = [
  '제과',
  '베이커리',
  '디저트',
  '케이크',
  '도넛',
  '아이스크림',
  '빙수',
  '마카롱',
  '탕후루',
  '호떡',
  '붕어빵',
  '와플',
  '크레페',
  '쿠키',
  '슈',
  '티라미수',
]

const CAFE_KEYWORDS = ['카페', '커피전문', '커피숍', '스타벅스', '이디야', '투썸']

const MEAL_CATEGORY_KEYWORDS = [
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '국밥',
  '찌개',
  '고깃',
  '고기',
  '면',
  '치킨',
  '피자',
  '햄버거',
  '수산',
  '회',
  '백반',
  '샤브',
  '곱창',
  '족발',
  '보쌈',
  '삼겹',
  '갈비',
  '국수',
  '냉면',
  '초밥',
  '돈까스',
  '카레',
  '우동',
  '라멘',
  '파스타',
  '스테이크',
  '패스트푸드',
  '도시락',
  '김밥',
  '떡볶',
  '술집',
  '주점',
  '호프',
  '포장마차',
  '이자카야',
  '브런치',
]

export function parseRadiusMeters(time: string): number {
  if (time.includes('1시간 이상') || time.includes('1시간이상') || time.includes('1km')) return 1000
  if (time.includes('30분') || time.includes('400m')) return 400
  if (time.includes('1시간') || time.includes('700m')) return 700
  return 700
}

export function estimateWalkMin(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 80))
}

/** 직장인 점심·저녁 한 끼 식사 가능한 곳인지 판별 */
export function isEligibleMealPlace(
  categoryName: string,
  situation: string,
  meal: string,
): boolean {
  const category = categoryName ?? ''

  if (ALWAYS_EXCLUDED.some((word) => category.includes(word))) return false
  if (SNACK_DESSERT_KEYWORDS.some((word) => category.includes(word))) return false

  // 간식 카테고리(분식 제외) — 베이커리·디저트류
  if (category.includes('간식') && !category.includes('분식')) return false

  const isDinner = meal.includes('저녁') || situation === '회식'

  if (CAFE_KEYWORDS.some((word) => category.includes(word))) {
    return false
  }

  // 점심·회식: 한 끼 식사 카테고리만
  const mealKeywords = isDinner
    ? [...MEAL_CATEGORY_KEYWORDS, '주점', '호프', '술집']
    : MEAL_CATEGORY_KEYWORDS.filter(
        (w) => !['주점', '호프', '술집', '포장마차', '이자카야'].includes(w),
      )

  return mealKeywords.some((word) => category.includes(word))
}

export function mealTypeBonus(categoryName: string): number {
  const strongMeal = ['국밥', '한식', '중식', '고깃', '삼겹', '갈비', '찌개', '백반', '분식']
  if (strongMeal.some((w) => categoryName.includes(w))) return 12
  if (MEAL_CATEGORY_KEYWORDS.some((w) => categoryName.includes(w))) return 6
  return 0
}

export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number,
  apiKey: string,
  maxResults = 30,
): Promise<KakaoPlace[]> {
  const seen = new Set<string>()
  const results: KakaoPlace[] = []

  for (let page = 1; page <= 3; page++) {
    const url = new URL('https://dapi.kakao.com/v2/local/search/category.json')
    url.searchParams.set('category_group_code', 'FD6')
    url.searchParams.set('x', String(lng))
    url.searchParams.set('y', String(lat))
    url.searchParams.set('radius', String(radius))
    url.searchParams.set('sort', 'distance')
    url.searchParams.set('size', '15')
    url.searchParams.set('page', String(page))

    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    })

    if (!res.ok) {
      throw new Error(`Kakao Local API error: ${res.status}`)
    }

    const data = (await res.json()) as { documents?: KakaoPlace[] }
    const batch = data.documents ?? []

    for (const place of batch) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      results.push(place)

      if (results.length >= maxResults) {
        return results
      }
    }

    if (batch.length < 15) break
  }

  return results
}

/** 키워드 검색 — 문답 음식 조건에 맞는 식당 추가 수집 */
export async function searchNearbyByKeyword(
  lat: number,
  lng: number,
  radius: number,
  query: string,
  apiKey: string,
  maxResults = 15,
): Promise<KakaoPlace[]> {
  const seen = new Set<string>()
  const results: KakaoPlace[] = []

  for (let page = 1; page <= 2; page++) {
    const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
    url.searchParams.set('query', query)
    url.searchParams.set('x', String(lng))
    url.searchParams.set('y', String(lat))
    url.searchParams.set('radius', String(radius))
    url.searchParams.set('sort', 'distance')
    url.searchParams.set('size', '15')
    url.searchParams.set('page', String(page))
    url.searchParams.set('category_group_code', 'FD6')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    })

    if (!res.ok) break

    const data = (await res.json()) as { documents?: KakaoPlace[] }
    const batch = data.documents ?? []

    for (const place of batch) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      results.push(place)
      if (results.length >= maxResults) return results
    }

    if (batch.length < 15) break
  }

  return results
}

export async function searchRestaurantsForQuiz(
  lat: number,
  lng: number,
  radius: number,
  apiKey: string,
  queries: string[],
  maxResults = 40,
): Promise<KakaoPlace[]> {
  if (queries.length === 0) {
    return searchNearbyRestaurants(lat, lng, radius, apiKey, maxResults)
  }

  const batches = await Promise.all(
    queries.map((q) => searchNearbyByKeyword(lat, lng, radius, q, apiKey, 15)),
  )

  const seen = new Set<string>()
  const merged: KakaoPlace[] = []
  for (const place of batches.flat()) {
    if (seen.has(place.id)) continue
    seen.add(place.id)
    merged.push(place)
    if (merged.length >= maxResults) break
  }
  return merged
}

/** @deprecated searchRestaurantsForQuiz 사용 */
export async function searchRestaurantsForRequest(
  lat: number,
  lng: number,
  radius: number,
  apiKey: string,
  foodQueries: string[],
  maxResults = 40,
): Promise<KakaoPlace[]> {
  return searchRestaurantsForQuiz(lat, lng, radius, apiKey, foodQueries, maxResults)
}

export function foodMatchScore(
  categoryName: string,
  foodPrefs: string[],
  placeName = '',
): number {
  if (foodPrefs.some((f) => f.includes('자유'))) return 12

  const text = `${categoryName} ${placeName}`
  let score = 0
  for (const pref of foodPrefs) {
    const keywords = FOOD_KEYWORDS[pref] ?? []
    if (keywords.some((kw) => text.includes(kw))) {
      score += 12
    }
  }
  return Math.min(score, 25)
}

export function weatherMatchScore(categoryName: string, temp: number): number {
  const isSoup = ['국밥', '국수', '찌개', '탕', '전골', '칼국수', '우동', '라멘'].some((kw) =>
    categoryName.includes(kw),
  )
  const isLight = ['샐러드', '죽', '회', '초밥', '냉면', '포케'].some((kw) =>
    categoryName.includes(kw),
  )

  if (temp <= 10 && isSoup) return 15
  if (temp >= 28 && isLight) return 15
  if (temp > 10 && temp < 28) return 8
  return 4
}

export function situationBonus(categoryName: string, situation: string): number {
  if (situation === '회식') {
    return ['고기', '주점', '호프', '삼겹', '갈비', '회', '한정식'].some((kw) =>
      categoryName.includes(kw),
    )
      ? 10
      : 0
  }
  if (situation === '혼밥') {
    return ['국밥', '분식', '백반', '면', '돈까스', '김밥'].some((kw) =>
      categoryName.includes(kw),
    )
      ? 8
      : 4
  }
  if (situation === '함께') {
    return ['고기', '분식', '백반', '한정식', '면', '덮밥'].some((kw) =>
      categoryName.includes(kw),
    )
      ? 8
      : 4
  }
  return 4
}

export function budgetPenalty(budget: string, categoryName: string): number {
  if (budget.includes('법인') || budget.includes('제한 없음')) return 0
  if (budget.includes('1만원 이하')) {
    return ['스테이크', '오마카세', '한정식'].some((kw) => categoryName.includes(kw)) ? -15 : 0
  }
  return 0
}
