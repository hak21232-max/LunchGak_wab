import { getPickComment } from './pickReason'

function pickLine(pick) {
  const comment = getPickComment(pick) ?? pick.reason ?? ''
  const url = pick.place_url ? `\n   ${pick.place_url}` : ''
  return `${pick.rank}위 ${pick.name} · 도보 ${pick.walk_min}분\n   ${comment}${url}`
}

export function buildShareText(data) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lunchgak-wab.pages.dev'
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
  lines.push('', `▶ ${origin}/quiz`)
  return lines.join('\n')
}

export async function shareRecommendResult(data) {
  const text = buildShareText(data)
  const title = '런치각 점심 추천'
  const url = typeof window !== 'undefined' ? `${window.location.origin}/quiz` : ''

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return { ok: true, method: 'share' }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, method: 'cancel' }
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return { ok: true, method: 'clipboard' }
  } catch {
    return { ok: false, method: 'failed' }
  }
}
