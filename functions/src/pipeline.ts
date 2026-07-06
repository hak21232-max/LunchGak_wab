import { estimateWalkMin, parseRadiusMeters, searchNearbyRestaurants } from './kakao'
import { enrichWithBlogData } from './naver'
import { applyExcellentRestaurantBonus } from './publicdata'
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
  blogScores: Map<string, number>,
  placesWithBonus: Array<KakaoPlace & { excellentBonus?: boolean }>,
): EnrichedCandidate[] {
  const bonusMap = new Map(
    placesWithBonus.map((place) => [place.id, place.excellentBonus ?? false]),
  )

  return places.slice(0, GEMINI_CANDIDATE_LIMIT).map((place) => {
    const distanceM = Math.max(Number(place.distance), 1)
    const excellentBonus = bonusMap.get(place.id) ?? false

    return {
      ...place,
      walkMin: estimateWalkMin(distanceM),
      blogMentions: blogScores.get(place.place_name) ?? 0,
      isExemplary: excellentBonus,
      excellentBonus,
    }
  })
}

function resolveCandidate(
  pick: { place_id: string; name: string; rank: number },
  candidates: EnrichedCandidate[],
): EnrichedCandidate | undefined {
  const byId = candidates.find((c) => String(c.id) === String(pick.place_id))
  if (byId) return byId

  const byName = candidates.find((c) => c.place_name === pick.name)
  if (byName) return byName

  const normalized = pick.name?.replace(/\s/g, '')
  const byPartialName = candidates.find(
    (c) =>
      c.place_name.replace(/\s/g, '') === normalized ||
      c.place_name.includes(pick.name) ||
      pick.name.includes(c.place_name),
  )
  if (byPartialName) return byPartialName

  return candidates[pick.rank - 1]
}

function toCoord(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function buildResponse(
  req: RecommendRequest,
  candidates: EnrichedCandidate[],
  gemini: ReturnType<typeof fallbackGeminiOutput>,
  weatherComment: string | null,
): RecommendResponse {
  const picks: PickResult[] = gemini.picks.slice(0, 3).map((pick) => {
    const place = resolveCandidate(pick, candidates)

    return {
      rank: pick.rank,
      place_id: place?.id ?? pick.place_id,
      name: pick.name || place?.place_name || '추천 식당',
      category: pick.category || place?.category_name || '',
      reason: pick.reason,
      tip: pick.tip,
      walk_min: pick.walk_min ?? place?.walkMin ?? 5,
      mood_match_score: pick.mood_match_score,
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
  }
}

export async function runRecommendationPipeline(
  req: RecommendRequest,
  secrets: PipelineSecrets,
): Promise<RecommendResponse> {
  const radius = parseRadiusMeters(req.time)

  // 1. 날씨 조회
  const weather = await fetchWeather(req.lat, req.lng, secrets.openWeatherApiKey)
  const weatherComment = buildWeatherComment(weather)

  // 2. 카카오 Local API — 반경 내 음식점 (최대 30개, 거리순)
  const places = await searchNearbyRestaurants(
    req.lat,
    req.lng,
    radius,
    secrets.kakaoRestApiKey,
    30,
  )

  if (places.length === 0) {
    throw new Error('주변에 음식점이 없어요.')
  }

  const targetPlaces = places.slice(0, GEMINI_CANDIDATE_LIMIT)

  // 3. 네이버 블로그 언급 수
  const { blogScores } = await enrichWithBlogData(
    targetPlaces,
    secrets.naverClientId,
    secrets.naverClientSecret,
  )

  // 4. 모범음식점 여부
  const placesWithBonus = await applyExcellentRestaurantBonus(
    targetPlaces,
    secrets.dataGoKrServiceKey,
  )

  const candidates = buildEnrichedCandidates(targetPlaces, blogScores, placesWithBonus)

  // 5. Gemini 추천 (순위·필터링 전담)
  let geminiOutput
  try {
    geminiOutput = await generateRecommendations(req, candidates, weather, secrets.geminiApiKey)
  } catch {
    geminiOutput = fallbackGeminiOutput(req, candidates, weather)
  }

  return buildResponse(req, candidates, geminiOutput, weatherComment)
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
    !data.situation ||
    !data.mood ||
    food.length === 0 ||
    !data.time ||
    !data.budget ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    throw new Error('필수 항목(situation, mood, food, time, budget, lat, lng)이 필요해요.')
  }

  return {
    situation: String(data.situation),
    mood: String(data.mood),
    food,
    time: String(data.time),
    budget: String(data.budget),
    lat,
    lng,
  }
}
