import { resolveFunctionUrl } from './functionsUrl'

function getOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://lunchgak-wab.pages.dev'
}

export function buildSharePageUrl(id) {
  return `${getOrigin()}/share/${id}`
}

export async function createShareLink(data, { lat, lng }) {
  const endpoint = resolveFunctionUrl('saveShareResult')
  if (!endpoint) {
    throw new Error('공유 기능을 사용하려면 Functions URL 설정이 필요해요.')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      greeting: data.greeting,
      recommendation_reason: data.recommendation_reason,
      picks: data.picks,
      weather_comment: data.weather_comment ?? null,
      lat,
      lng,
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.error ?? `공유 링크 생성 실패 (${response.status})`)
  }
  if (!json.id) {
    throw new Error('공유 링크를 받지 못했어요.')
  }

  return buildSharePageUrl(json.id)
}

export async function fetchSharedResult(id) {
  const endpoint = resolveFunctionUrl('getShareResult')
  if (!endpoint) {
    throw new Error('Functions URL 설정이 필요해요.')
  }

  const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`)
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.error ?? `공유 결과를 불러오지 못했어요. (${response.status})`)
  }
  return json
}

export async function shareRecommendResult(data, location) {
  const shareUrl = await createShareLink(data, location)
  const title = '런치각 점심 추천'
  const text = data.greeting ?? '점심 맛집 추천 결과'

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: shareUrl })
      return { ok: true, method: 'share', url: shareUrl }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, method: 'cancel' }
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl)
    return { ok: true, method: 'clipboard', url: shareUrl }
  } catch {
    return { ok: false, method: 'failed' }
  }
}
