import { randomBytes } from 'crypto'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { PickResult } from './types'

const SHARE_TTL_DAYS = 7
const MAX_PICKS = 3
const ID_PATTERN = /^[A-Za-z0-9_-]{8,16}$/

export interface SharePayload {
  greeting: string
  recommendation_reason: string
  picks: PickResult[]
  weather_comment: string | null
  lat: number
  lng: number
}

export interface ShareDocument extends SharePayload {
  createdAt: Timestamp
  expiresAt: Timestamp
}

function asString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

function asNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizePick(raw: unknown, rank: number): PickResult | null {
  if (!raw || typeof raw !== 'object') return null
  const pick = raw as Record<string, unknown>
  const lat = asNumber(pick.lat)
  const lng = asNumber(pick.lng)
  const walkMin = asNumber(pick.walk_min)
  if (lat == null || lng == null || walkMin == null) return null

  return {
    rank,
    place_id: asString(pick.place_id, 32),
    name: asString(pick.name, 80),
    category: asString(pick.category, 120),
    reason: asString(pick.reason, 400),
    tip: pick.tip == null ? null : asString(pick.tip, 200) || null,
    walk_min: Math.max(0, Math.round(walkMin)),
    mood_match_score: Math.max(0, Math.min(100, Math.round(asNumber(pick.mood_match_score) ?? 0))),
    place_url: asString(pick.place_url, 300),
    blog_count: Math.max(0, Math.round(asNumber(pick.blog_count) ?? 0)),
    is_exemplary: Boolean(pick.is_exemplary),
    lat,
    lng,
  }
}

export function validateSharePayload(body: unknown): SharePayload {
  if (!body || typeof body !== 'object') {
    throw new Error('공유할 데이터 형식이 올바르지 않아요.')
  }

  const input = body as Record<string, unknown>
  const lat = asNumber(input.lat)
  const lng = asNumber(input.lng)
  if (lat == null || lng == null) {
    throw new Error('위치 정보가 필요해요.')
  }

  const rawPicks = Array.isArray(input.picks) ? input.picks : []
  const picks = rawPicks
    .slice(0, MAX_PICKS)
    .map((pick, index) => normalizePick(pick, index + 1))
    .filter((pick): pick is PickResult => pick != null && pick.name.length > 0)

  if (picks.length === 0) {
    throw new Error('공유할 추천 결과가 없어요.')
  }

  return {
    greeting: asString(input.greeting, 200) || '런치각 점심 추천',
    recommendation_reason: asString(input.recommendation_reason, 600),
    weather_comment:
      input.weather_comment == null ? null : asString(input.weather_comment, 200) || null,
    picks,
    lat,
    lng,
  }
}

function generateShareId(): string {
  return randomBytes(6).toString('base64url')
}

export async function saveShareResult(payload: SharePayload): Promise<string> {
  const db = getFirestore()
  const now = Date.now()
  const doc: ShareDocument = {
    ...payload,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000),
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = generateShareId()
    const ref = db.collection('shared_results').doc(id)
    const existing = await ref.get()
    if (existing.exists) continue
    await ref.set(doc)
    return id
  }

  throw new Error('공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
}

export async function loadShareResult(id: string): Promise<SharePayload & { expiresAt: string }> {
  if (!ID_PATTERN.test(id)) {
    throw new Error('유효하지 않은 공유 링크예요.')
  }

  const snap = await getFirestore().collection('shared_results').doc(id).get()
  if (!snap.exists) {
    throw new Error('공유 링크를 찾을 수 없거나 만료됐어요.')
  }

  const data = snap.data() as ShareDocument
  if (data.expiresAt.toMillis() < Date.now()) {
    throw new Error('공유 링크가 만료됐어요.')
  }

  return {
    greeting: data.greeting,
    recommendation_reason: data.recommendation_reason,
    picks: data.picks,
    weather_comment: data.weather_comment,
    lat: data.lat,
    lng: data.lng,
    expiresAt: data.expiresAt.toDate().toISOString(),
  }
}
