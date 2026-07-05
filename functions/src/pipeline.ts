import { estimateWalkMin, parseRadiusMeters, searchNearbyRestaurants } from './kakao'
import { enrichWithBlogData } from './naver'
import { applyExcellentRestaurantBonus } from './publicdata'
import { fetchWeather, buildWeatherComment } from './weather'
import { fallbackGeminiOutput, generateRecommendations } from './gemini'
import type {
  KakaoPlace,
  PickResult,
  RecommendRequest,
  RecommendResponse,
  ScoredPlace,
} from './types'

interface PipelineSecrets {
  kakaoRestApiKey: string
  naverClientId: string
  naverClientSecret: string
  openWeatherApiKey: string
  geminiApiKey: string
  dataGoKrServiceKey: string
}

type ScoringCandidate = KakaoPlace & { excellentBonus?: boolean }

function scorePlaces(
  places: ScoringCandidate[],
  blogScores: Map<string, number>,
): ScoredPlace[] {
  return places
    .map((place) => {
      const distanceM = Math.max(Number(place.distance), 1)
      const walkMin = estimateWalkMin(distanceM)
      const blogMentions = blogScores.get(place.place_name) ?? 0
      const excellentBonus = place.excellentBonus ?? false

      const distanceScore = (1 / distanceM) * 10000
      const blogScore = Math.log(blogMentions + 1) * 5
      const excellentScore = excellentBonus ? 15 : 0
      const score = distanceScore + blogScore + excellentScore

      return {
        ...place,
        score,
        walkMin,
        blogMentions,
        isExemplary: excellentBonus,
        excellentBonus,
        distanceScore,
        blogScore,
        excellentScore,
      }
    })
    .sort((a, b) => b.score - a.score)
}

function buildResponse(
  req: RecommendRequest,
  scored: ScoredPlace[],
  gemini: ReturnType<typeof fallbackGeminiOutput>,
  weatherComment: string | null,
): RecommendResponse {
  const placeMap = new Map(scored.map((p) => [String(p.id), p]))

  const picks: PickResult[] = gemini.picks.slice(0, 3).map((pick, index) => {
    const place = placeMap.get(String(pick.place_id)) ?? scored[index]
    return {
      rank: index + 1,
      place_id: place?.id ?? pick.place_id,
      name: place?.place_name ?? '추천 식당',
      category: place?.category_name ?? '',
      reason: pick.reason,
      tip: pick.tip,
      walk_min: place?.walkMin ?? 5,
      mood_match_score: Math.min(99, Math.round(place?.score ?? 70)),
      place_url: place?.place_url ?? '',
      blog_count: place?.blogMentions ?? 0,
      is_exemplary: place?.isExemplary ?? false,
      lat: Number(place?.y ?? req.lat),
      lng: Number(place?.x ?? req.lng),
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

  // 2. 카카오 Local API 후보 조회 (식사 가능 업소 필터 포함)
  const places = await searchNearbyRestaurants(
    req.lat,
    req.lng,
    radius,
    secrets.kakaoRestApiKey,
    req.situation,
    req.time,
  )

  if (places.length === 0) {
    throw new Error('주변에 점심·저녁 식사 가능한 음식점이 없어요.')
  }

  // 3. 네이버 블로그 언급 수 가점
  const { blogScores } = await enrichWithBlogData(
    places,
    secrets.naverClientId,
    secrets.naverClientSecret,
  )

  // 4. 모범음식점 가점 적용
  const placesWithBonus = await applyExcellentRestaurantBonus(
    places,
    secrets.dataGoKrServiceKey,
  )

  // 5. 스코어링
  const scored = scorePlaces(placesWithBonus, blogScores)

  // 6. Gemini 추천
  let geminiOutput
  try {
    geminiOutput = await generateRecommendations(req, scored, weather, secrets.geminiApiKey)
  } catch {
    geminiOutput = fallbackGeminiOutput(req, scored, weather)
  }

  return buildResponse(req, scored, geminiOutput, weatherComment)
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
