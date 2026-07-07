import { filterByKakaoCategory } from './categoryFilter'
import { filterValidatedCandidates, validateGeminiPicks } from './foodValidation'
import { estimateWalkMin, parseRadiusMeters, searchRestaurantsForQuiz } from './kakao'
import { computeReputationScore, enrichWithBlogData, type BlogStats } from './naver'
import { applyExcellentRestaurantBonus } from './publicdata'
import { buildQuizSearchQueries, resolveFoodVibe } from './quizSearch'
import { fetchWeather, buildWeatherComment } from './weather'
import { fallbackGeminiOutput, generateRecommendations } from './gemini'
import type {
  EnrichedCandidate,
  KakaoPlace,
  PickResult,
  RecommendRequest,
  RecommendResponse,
} from './types'

const GEMINI_CANDIDATE_LIMIT = 15

interface PipelineSecrets {
  kakaoRestApiKey: string
  naverClientId: string
  naverClientSecret: string
  openWeatherApiKey: string
  geminiApiKey: string
  dataGoKrServiceKey: string
}

function buildEnrichedCandidates(
  places: KakaoPlace[],
  blogStats: Map<string, BlogStats>,
  placesWithBonus: Array<KakaoPlace & { excellentBonus?: boolean }>,
): EnrichedCandidate[] {
  const bonusMap = new Map(
    placesWithBonus.map((place) => [place.id, place.excellentBonus ?? false]),
  )

  return places.map((place) => {
    const distanceM = Math.max(Number(place.distance), 1)
    const excellentBonus = bonusMap.get(place.id) ?? false
    const walkMin = estimateWalkMin(distanceM)
    const stats = blogStats.get(place.place_name) ?? {
      mentionCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      positiveRatio: 0.5,
      topKeywords: [],
      menuMentions: [],
      blogSnippets: [],
    }

    return {
      ...place,
      walkMin,
      blogMentions: stats.mentionCount,
      blogPositiveCount: stats.positiveCount,
      blogNegativeCount: stats.negativeCount,
      blogPositiveRatio: stats.positiveRatio,
      blogTopKeywords: stats.topKeywords,
      blogMenuMentions: stats.menuMentions,
      blogSnippets: stats.blogSnippets,
      reputationScore: computeReputationScore(stats, walkMin, excellentBonus),
      isExemplary: excellentBonus,
      excellentBonus,
    }
  })
}

function selectCandidatesForGemini(candidates: EnrichedCandidate[]): EnrichedCandidate[] {
  return [...candidates]
    .sort((a, b) => {
      const scoreDiff = b.reputationScore - a.reputationScore
      if (Math.abs(scoreDiff) > 0.5) return scoreDiff
      return a.walkMin - b.walkMin
    })
    .slice(0, GEMINI_CANDIDATE_LIMIT)
}

function resolveCandidate(
  pick: { place_id: string; name: string; rank: number },
  candidates: EnrichedCandidate[],
  index = 0,
): EnrichedCandidate {
  const byId = candidates.find((c) => String(c.id) === String(pick.place_id))
  if (byId) return byId

  const byName = candidates.find((c) => c.place_name === pick.name)
  if (byName) return byName

  const normalized = pick.name?.replace(/\s/g, '')
  const byPartial = candidates.find(
    (c) =>
      c.place_name.replace(/\s/g, '') === normalized ||
      c.place_name.includes(pick.name) ||
      pick.name.includes(c.place_name),
  )
  if (byPartial) return byPartial

  return candidates[index] ?? candidates[pick.rank - 1] ?? candidates[0]
}

function toCoord(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function buildNoMatchResponse(
  req: RecommendRequest,
  weatherComment: string | null,
): RecommendResponse {
  return {
    greeting: '근처에 딱 맞는 맛집이 없네요 😅',
    recommendation_reason: `'${resolveFoodVibe(req)}' 조건에 맞는 식당을 찾지 못했어요. 반경을 넓히거나 다른 메뉴를 선택해 보세요.`,
    picks: [],
    weather_comment: weatherComment,
    nearby_no_match: true,
  }
}

function buildResponse(
  candidates: EnrichedCandidate[],
  gemini: { greeting: string; recommendation_reason: string; picks: PickResult[] | unknown[]; weather_comment: string | null },
  weatherComment: string | null,
  nearbyNoMatch: boolean,
): RecommendResponse {
  const picks: PickResult[] = (gemini.picks as Array<Record<string, unknown>>).map((pick) => {
    const place = resolveCandidate(
      {
        place_id: String(pick.place_id),
        name: String(pick.name),
        rank: Number(pick.rank),
      },
      candidates,
    )

    return {
      rank: Number(pick.rank),
      place_id: place?.id ?? String(pick.place_id),
      name: String(pick.name || place?.place_name || '추천 식당'),
      category: String(pick.category || place?.category_name || ''),
      reason: String(pick.reason ?? ''),
      tip: (pick.tip as string | null) ?? null,
      walk_min: Number(pick.walk_min ?? place?.walkMin ?? 5),
      mood_match_score: Number(pick.mood_match_score ?? 80),
      place_url: place?.place_url ?? '',
      blog_count: place?.blogMentions ?? 0,
      is_exemplary: place?.isExemplary ?? false,
      lat: toCoord(place?.y),
      lng: toCoord(place?.x),
    }
  })

  return {
    greeting: gemini.greeting,
    recommendation_reason: gemini.recommendation_reason,
    picks,
    weather_comment: gemini.weather_comment ?? weatherComment,
    nearby_no_match: nearbyNoMatch,
  }
}

export async function runRecommendationPipeline(
  req: RecommendRequest,
  secrets: PipelineSecrets,
): Promise<RecommendResponse> {
  const radius = parseRadiusMeters(req.time)

  const weather = await fetchWeather(req.lat, req.lng, secrets.openWeatherApiKey)
  const weatherComment = buildWeatherComment(weather)

  const searchQueries = buildQuizSearchQueries(req)
  const rawPlaces = await searchRestaurantsForQuiz(
    req.lat,
    req.lng,
    radius,
    secrets.kakaoRestApiKey,
    searchQueries,
    40,
  )

  if (rawPlaces.length === 0) {
    return buildNoMatchResponse(req, weatherComment)
  }

  const categoryFiltered = filterByKakaoCategory(rawPlaces, req)
  if (categoryFiltered.length === 0) {
    return buildNoMatchResponse(req, weatherComment)
  }

  const targetPlaces = categoryFiltered.slice(0, 30)

  const { blogStats } = await enrichWithBlogData(
    targetPlaces,
    secrets.naverClientId,
    secrets.naverClientSecret,
    req,
  )

  const placesWithBonus = await applyExcellentRestaurantBonus(
    targetPlaces,
    secrets.dataGoKrServiceKey,
  )

  const allCandidates = buildEnrichedCandidates(targetPlaces, blogStats, placesWithBonus)

  const validatedPool = filterValidatedCandidates(allCandidates, req)
  if (validatedPool.length === 0) {
    return buildNoMatchResponse(req, weatherComment)
  }

  const candidates = selectCandidatesForGemini(validatedPool)

  let geminiOutput
  try {
    geminiOutput = await generateRecommendations(req, candidates, weather, secrets.geminiApiKey)
  } catch {
    geminiOutput = fallbackGeminiOutput(req, candidates, weather)
  }

  const { output: validatedOutput, nearby_no_match } = validateGeminiPicks(
    geminiOutput,
    allCandidates,
    req,
    resolveCandidate,
  )

  if (nearby_no_match) {
    return buildNoMatchResponse(req, weatherComment)
  }

  return buildResponse(allCandidates, validatedOutput, weatherComment, false)
}

export function validateRecommendRequest(body: unknown): RecommendRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('요청 body가 올바르지 않아요.')
  }

  const data = body as Record<string, unknown>
  const lat = Number(data.lat)
  const lng = Number(data.lng)
  const food = Array.isArray(data.food) ? data.food.map(String) : []

  if (
    !data.meal ||
    !data.situation ||
    !data.mood ||
    food.length === 0 ||
    !data.time ||
    !data.budget ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    throw new Error('필수 항목(meal, situation, mood, food, time, budget, lat, lng)이 필요해요.')
  }

  return {
    meal: String(data.meal),
    situation: String(data.situation),
    mood: String(data.mood),
    food,
    time: String(data.time),
    budget: String(data.budget),
    lat,
    lng,
  }
}
