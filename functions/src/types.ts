export interface RecommendRequest {
  situation: string
  mood: string
  food: string[]
  time: string
  budget: string
  lat: number
  lng: number
}

export interface KakaoPlace {
  id: string
  place_name: string
  category_name: string
  distance: string
  x: string
  y: string
  place_url: string
  address_name?: string
  road_address_name?: string
}

export interface EnrichedCandidate extends KakaoPlace {
  walkMin: number
  blogMentions: number
  blogPositiveCount: number
  blogNegativeCount: number
  blogPositiveRatio: number
  blogTopKeywords: string[]
  reputationScore: number
  isExemplary: boolean
  excellentBonus: boolean
}

export interface WeatherInfo {
  temp: number
  description: string
  feelsLike: number
}

export interface PickResult {
  rank: number
  place_id: string
  name: string
  category: string
  reason: string
  tip: string | null
  walk_min: number
  mood_match_score: number
  place_url: string
  blog_count: number
  is_exemplary: boolean
  lat: number
  lng: number
}

export interface RecommendResponse {
  greeting: string
  recommendation_reason: string
  picks: PickResult[]
  weather_comment: string | null
}

export interface GeminiPickDraft {
  rank: number
  place_id: string
  name: string
  category: string
  reason: string
  tip: string | null
  walk_min: number
  mood_match_score: number
}

export interface GeminiOutput {
  greeting: string
  recommendation_reason: string
  picks: GeminiPickDraft[]
  weather_comment: string | null
}
