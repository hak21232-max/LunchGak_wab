import { getPickComment } from './pickReason'
import { decodeSharePayload, encodeSharePayload, isServerShareId } from './shareCodec'
import { resolveFunctionUrl } from './functionsUrl'

function getOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://lunchgak-wab.pages.dev'
}

function pickLine(pick) {
  const comment = getPickComment(pick) ?? pick.reason ?? ''
  const url = pick.place_url ? `\n   🗺 ${pick.place_url}` : ''
  return `${pick.rank}위 ${pick.name} · 도보 ${pick.walk_min}분\n   ${comment}${url}`
}

export function buildShareText(data, shareUrl) {
  const lines = [
    '🍽️ 런치각 점심 추천',
    '',
    data.greeting,
    '',
    ...(data.picks ?? []).map(pickLine),
    '',
    data.recommendation_reason,
  ]
  if (data.weather_comment) lines.push('', `🌤 ${data.weather_comment}`)
  if (shareUrl) lines.push('', '👉 결과 보기', shareUrl)
  lines.push('', '— 런치각')
  return lines.join('\n')
}

export function buildSharePageUrl(id) {
  return `${getOrigin()}/share/${id}`
}

/** 서버 없이 즉시 생성 — Web Share 사용자 제스처 유지용 */
export function buildEmbeddedShareUrl(data, location) {
  const encoded = encodeSharePayload(data, location)
  return `${getOrigin()}/share?d=${encoded}`
}

async function tryCreateServerShareLink(data, location) {
  const endpoint = resolveFunctionUrl('saveShareResult')
  if (!endpoint) return null

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        greeting: data.greeting,
        recommendation_reason: data.recommendation_reason,
        picks: data.picks,
        weather_comment: data.weather_comment ?? null,
        lat: location.lat,
        lng: location.lng,
      }),
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok || !json.id) return null
    return buildSharePageUrl(json.id)
  } catch {
    return null
  }
}

export async function createShareLink(data, location) {
  const serverUrl = await tryCreateServerShareLink(data, location)
  if (serverUrl) return serverUrl
  return buildEmbeddedShareUrl(data, location)
}

export async function fetchSharedResult(id) {
  const endpoint = resolveFunctionUrl('getShareResult')
  if (!endpoint) {
    throw new Error('공유 결과를 불러올 수 없어요.')
  }

  const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`)
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.error ?? '공유 링크를 찾을 수 없거나 만료됐어요.')
  }
  return json
}

export function loadEmbeddedShare(encoded) {
  const data = decodeSharePayload(encoded)
  if (!data) {
    throw new Error('공유 링크 형식이 올바르지 않아요.')
  }
  return data
}

export async function shareRecommendResult(data, location) {
  // 링크는 동기 생성 — await(fetch) 후 share 호출 시 모바일에서 공유 시트가 안 뜸
  const shareUrl = buildEmbeddedShareUrl(data, location)
  const title = '런치각 점심 추천'
  const text = buildShareText(data, shareUrl)

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url: shareUrl })
      return { ok: true, method: 'share', url: shareUrl }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, method: 'cancel' }
      try {
        await navigator.share({ title, text })
        return { ok: true, method: 'share', url: shareUrl }
      } catch (err2) {
        if (err2?.name === 'AbortError') return { ok: false, method: 'cancel' }
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return { ok: true, method: 'clipboard', url: shareUrl }
  } catch {
    return { ok: false, method: 'failed' }
  }
}

export async function resolveSharedResult(id, encodedQuery) {
  if (encodedQuery) {
    return loadEmbeddedShare(encodedQuery)
  }
  if (id && isServerShareId(id)) {
    return fetchSharedResult(id)
  }
  if (id) {
    const embedded = decodeSharePayload(id)
    if (embedded) return embedded
  }
  throw new Error('공유 링크가 올바르지 않아요.')
}
