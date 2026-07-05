const API_ENDPOINT = 'https://apis.data.go.kr/1741000/excellent_restaurant_info'
const FETCH_TIMEOUT_MS = 5000
const NUM_OF_ROWS = 100

export interface Candidate {
  place_name: string
  excellentBonus?: boolean
}

interface ExcellentRestaurantItem {
  BSNSSP_NM?: string
  [key: string]: unknown
}

interface ExcellentRestaurantResponse {
  response?: {
    header?: {
      resultCode?: string
      resultMsg?: string
    }
    body?: {
      items?: {
        item?: ExcellentRestaurantItem | ExcellentRestaurantItem[]
      }
      totalCount?: number
    }
  }
}

function normalizeName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}

function namesMatch(candidateName: string, excellentName: string): boolean {
  const left = normalizeName(candidateName)
  const right = normalizeName(excellentName)

  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

function extractBusinessName(item: ExcellentRestaurantItem): string {
  const name = item.BSNSSP_NM
  return typeof name === 'string' ? name.trim() : ''
}

function parseItems(data: ExcellentRestaurantResponse): ExcellentRestaurantItem[] {
  const item = data.response?.body?.items?.item
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

function withBonusFalse<T extends Candidate>(candidates: T[]): T[] {
  return candidates.map((candidate) => ({
    ...candidate,
    excellentBonus: false,
  }))
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchExcellentRestaurantNames(serviceKey: string): Promise<string[]> {
  const url = new URL(API_ENDPOINT)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', String(NUM_OF_ROWS))
  url.searchParams.set('returnType', 'json')

  const res = await fetchWithTimeout(url.toString())
  if (!res.ok) {
    throw new Error(`Excellent restaurant API error: ${res.status}`)
  }

  const data = (await res.json()) as ExcellentRestaurantResponse
  const resultCode = data.response?.header?.resultCode
  if (resultCode && resultCode !== '00') {
    throw new Error(
      `Excellent restaurant API result: ${resultCode} ${data.response?.header?.resultMsg ?? ''}`.trim(),
    )
  }

  return parseItems(data)
    .map(extractBusinessName)
    .filter((name) => name.length > 0)
}

function isExcellentRestaurant(
  candidateName: string,
  excellentNames: string[],
): boolean {
  return excellentNames.some((name) => namesMatch(candidateName, name))
}

export async function applyExcellentRestaurantBonus<T extends Candidate>(
  candidates: T[],
  serviceKey: string,
): Promise<T[]> {
  if (candidates.length === 0) return []

  try {
    const excellentNames = await fetchExcellentRestaurantNames(serviceKey)

    return candidates.map((candidate) => ({
      ...candidate,
      excellentBonus: isExcellentRestaurant(candidate.place_name, excellentNames),
    }))
  } catch {
    return withBonusFalse(candidates)
  }
}
