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
}

export interface ScoredPlace extends KakaoPlace {
  score: number
  walkMin: number
  blogMentions: number
  isExemplary: boolean
  excellentBonus: boolean
  distanceScore: number
  blogScore: number
  excellentScore: number
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
  place_id: string
  reason: string
  tip: string | null
}

export interface GeminiOutput {
  greeting: string
  recommendation_reason: string
  picks: GeminiPickDraft[]
  weather_comment: string | null
}
