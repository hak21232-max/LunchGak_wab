import { resolvePrimaryFoodVibe } from './quizSearch'
import type { KakaoPlace, RecommendRequest } from './types'

const EXCLUDE_ALWAYS = /편의점|마트|슈퍼|약국|병원|베이커리|디저트|카페/

/** 카카오 category_name 1차 필터 (블로그 전) */
export function filterByKakaoCategory(
  places: KakaoPlace[],
  req: RecommendRequest,
): KakaoPlace[] {
  if (req.food.some((f) => f.includes('자유'))) {
    return places.filter((p) => !EXCLUDE_ALWAYS.test(p.category_name))
  }

  const vibe = resolvePrimaryFoodVibe(req)
  return places.filter((p) => passesCategoryForVibe(p.category_name, vibe))
}

function passesCategoryForVibe(category: string, vibe: string): boolean {
  if (EXCLUDE_ALWAYS.test(category)) return false

  switch (vibe) {
    case '매운':
      if (SPICY_CATEGORY_BLOCK.some((r) => r.test(category))) return false
      return !/국밥|곰탕|설렁탕|돈까스|카츠|추어|초밥|스시|베이커리/.test(category)
    case '국물':
      return /국밥|곰탕|설렁탕|칼국수|우동|라멘|찌개|전골|탕|국수|쌀국수/.test(category)
    case '가벼운':
      return /샐러드|죽|비빔|포케|백반|초밥|회|브런치/.test(category) && !/고깃|삼겹|곱창|족발/.test(category)
    case '고기':
      return /고깃|삼겹|갈비|숯불|연탄|곱창|족발|보쌈|스테이크|육/.test(category) && !/국밥>/.test(category)
    case '면류':
      return /면|라멘|우동|칼국수|파스타|국수|냉면|중식>.*면|분식/.test(category) && !/고깃|삼겹|숯불/.test(category)
    case '밥류':
      return /백반|덮밥|비빔|볶음밥|김밥|한식|일식>.*덮|돈부리/.test(category) && !/고깃|삼겹|숯불|곱창/.test(category)
    default:
      return true
  }
}

const SPICY_CATEGORY_BLOCK = [
  /^음식점\s*>\s*한식\s*>\s*국밥$/,
  /추어탕/,
  /추어/,
  /곰탕/,
  /설렁탕/,
  /갈비탕/,
  /삼계탕/,
  /돈까스/,
  /카츠/,
  /초밥/,
  /스시/,
]
