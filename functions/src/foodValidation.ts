import { resolvePrimaryFoodVibe } from './quizSearch'
import type { EnrichedCandidate, GeminiOutput, RecommendRequest } from './types'

function blogCorpus(c: EnrichedCandidate): string {
  return [c.category_name, c.place_name, ...c.blogMenuMentions, ...c.blogSnippets.join(' ')].join(
    ' ',
  )
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((t) => text.includes(t))
}

function validateSpicy(c: EnrichedCandidate): boolean {
  const text = blogCorpus(c)
  const spicySignals = ['매운', '얼큰', '마라', '청양', '맵', '불닭', '양념']
  if (hasAny(text, spicySignals)) return true

  const spicyMenus = [
    '김치찌개',
    '부대찌개',
    '순두부',
    '제육볶음',
    '닭볶음',
    '떡볶이',
    '라볶이',
    '마라탕',
    '마라샹궈',
    '짬뽕',
    '낙지',
    '쭈꾸미',
    '감자탕',
  ]
  if (hasAny(text, spicyMenus)) return true

  return false
}

function validateNoodle(c: EnrichedCandidate): boolean {
  const cat = c.category_name
  const text = blogCorpus(c)
  const noodleTerms = ['국수', '라멘', '우동', '칼국수', '냉면', '파스타', '짜장', '짬뽕', '쌀국수']
  const hasNoodleMention = hasAny(text, noodleTerms)

  if (/고깃|삼겹|숯불|연탄|곱창/.test(cat) && !/면|국수|라멘|우동|분식/.test(cat)) {
    if (text.includes('냉면') && !hasAny(text, ['라멘', '우동', '칼국수', '국수', '파스타'])) {
      return false
    }
    return false
  }

  if (/면|라멘|우동|칼국수|파스타|국수|냉면|분식/.test(cat) && hasNoodleMention) return true
  if (hasNoodleMention && hasAny(text, ['라멘', '우동', '칼국수', '냉면', '파스타', '짜장면', '국수'])) {
    return true
  }
  return false
}

function validateMeat(c: EnrichedCandidate): boolean {
  const cat = c.category_name
  const text = blogCorpus(c)
  if (/^음식점\s*>\s*한식\s*>\s*국밥/.test(cat.replace(/\s/g, '')) && !/고깃|삼겹/.test(cat)) {
    return false
  }
  if (/고깃|삼겹|갈비|숯불|연탄|곱창|족발|보쌈|스테이크|정육/.test(cat)) return true
  return hasAny(text, ['삼겹살', '삼겹', '갈비', '스테이크', '고기무한', '육회', '숯불', '연탄'])
}

function validateSoup(c: EnrichedCandidate): boolean {
  const cat = c.category_name
  const text = blogCorpus(c)
  const soupTerms = ['국밥', '곰탕', '설렁탕', '갈비탕', '찌개', '전골', '탕', '해장국', '우동', '라멘', '칼국수']
  if (hasAny(text, soupTerms)) return true
  return /국밥|곰탕|설렁탕|찌개|전골|탕|해장|국수|우동|라멘/.test(cat)
}

function validateLight(c: EnrichedCandidate): boolean {
  const cat = c.category_name
  const text = blogCorpus(c)
  if (/고깃|삼겹|곱창|족발|숯불|튀김/.test(cat)) return false
  if (hasAny(text, ['삼겹', '곱창', '족발', '튀김'])) return false
  return (
    hasAny(text, ['샐러드', '죽', '비빔밥', '샌드위치', '포케', '두부', '쌈']) ||
    /샐러드|죽|비빔|포케|백반|초밥|회|브런치/.test(cat)
  )
}

function validateRice(c: EnrichedCandidate): boolean {
  const cat = c.category_name
  const text = blogCorpus(c)
  const riceTerms = ['덮밥', '비빔밥', '볶음밥', '백반', '김밥', '돈부리', '오므라이스', '제육덮밥', '비빔']
  if (/고깃|삼겹|숯불|연탄|곱창|족발/.test(cat) && !/덮밥|백반|비빔/.test(cat)) return false
  if (hasAny(text, riceTerms)) return true
  return /백반|덮밥|비빔|볶음밥|김밥|한식>.*밥/.test(cat)
}

function validateSingleVibe(vibe: string, c: EnrichedCandidate): boolean {
  if (vibe.includes('매운')) return validateSpicy(c)
  if (vibe.includes('국물')) return validateSoup(c)
  if (vibe.includes('가벼')) return validateLight(c)
  if (vibe.includes('고기')) return validateMeat(c)
  if (vibe.includes('면')) return validateNoodle(c)
  if (vibe.includes('밥')) return validateRice(c)
  return true
}

/** 음식 정확도 검증 — 블로그·카테고리 기준 */
export function passesFoodAccuracyValidation(
  req: RecommendRequest,
  c: EnrichedCandidate,
): boolean {
  if (req.food.some((f) => f.includes('자유'))) return true
  return req.food.some((food) => validateSingleVibe(food, c))
}

export function filterValidatedCandidates(
  candidates: EnrichedCandidate[],
  req: RecommendRequest,
): EnrichedCandidate[] {
  return candidates.filter((c) => passesFoodAccuracyValidation(req, c))
}

export interface ValidatedGeminiResult {
  output: GeminiOutput
  nearby_no_match: boolean
}

/** Gemini picks 최종 검증 — 통과 못하면 제외, 0개면 nearby_no_match */
export function validateGeminiPicks(
  output: GeminiOutput,
  candidates: EnrichedCandidate[],
  req: RecommendRequest,
  resolveCandidate: (
    pick: { place_id: string; name: string; rank: number },
    pool: EnrichedCandidate[],
    index: number,
  ) => EnrichedCandidate,
): ValidatedGeminiResult {
  const usedIds = new Set<string>()
  const validated: GeminiOutput['picks'] = []

  for (const pick of output.picks ?? []) {
    const place = resolveCandidate(pick, candidates, validated.length)
    if (usedIds.has(String(place.id))) continue
    if (!passesFoodAccuracyValidation(req, place)) continue

    usedIds.add(String(place.id))
    validated.push({
      ...pick,
      rank: validated.length + 1,
      place_id: String(place.id),
      name: place.place_name,
      category: place.category_name,
      walk_min: place.walkMin,
    })
  }

  if (validated.length === 0) {
    return {
      output: {
        ...output,
        picks: [],
        recommendation_reason: `'${resolvePrimaryFoodVibe(req)}' 조건에 맞는 식당을 블로그 검증까지 통과한 곳이 없어요.`,
      },
      nearby_no_match: true,
    }
  }

  return { output: { ...output, picks: validated }, nearby_no_match: false }
}
