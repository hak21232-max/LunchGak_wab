/** 추천 결과를 URL에 담아 공유 (서버 없이 동작) */

function compactPayload(data, { lat, lng }) {
  return {
    g: data.greeting,
    r: data.recommendation_reason,
    w: data.weather_comment ?? null,
    lat,
    lng,
    p: (data.picks ?? []).slice(0, 3).map((pick) => ({
      k: pick.rank,
      i: pick.place_id,
      n: pick.name,
      c: pick.category,
      rs: pick.reason,
      t: pick.tip ?? null,
      w: pick.walk_min,
      u: pick.place_url,
      b: pick.blog_count ?? 0,
      e: pick.is_exemplary ? 1 : 0,
      lat: pick.lat,
      lng: pick.lng,
    })),
  }
}

function expandPayload(raw) {
  if (!raw || !Array.isArray(raw.p)) return null
  return {
    greeting: raw.g ?? '런치각 점심 추천',
    recommendation_reason: raw.r ?? '',
    weather_comment: raw.w ?? null,
    lat: raw.lat,
    lng: raw.lng,
    picks: raw.p.map((pick) => ({
      rank: pick.k,
      place_id: pick.i,
      name: pick.n,
      category: pick.c,
      reason: pick.rs,
      tip: pick.t,
      walk_min: pick.w,
      mood_match_score: 0,
      place_url: pick.u,
      blog_count: pick.b ?? 0,
      is_exemplary: pick.e === 1,
      lat: pick.lat,
      lng: pick.lng,
    })),
  }
}

function toBase64Url(text) {
  const b64 = btoa(unescape(encodeURIComponent(text)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded) {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  return decodeURIComponent(escape(atob(b64)))
}

export function encodeSharePayload(data, location) {
  return toBase64Url(JSON.stringify(compactPayload(data, location)))
}

export function decodeSharePayload(encoded) {
  if (!encoded) return null
  try {
    const raw = JSON.parse(fromBase64Url(encoded))
    const expanded = expandPayload(raw)
    if (!expanded || !Number.isFinite(expanded.lat) || !Number.isFinite(expanded.lng)) {
      return null
    }
    if (!expanded.picks?.length) return null
    return expanded
  } catch {
    return null
  }
}

const SERVER_ID_PATTERN = /^[A-Za-z0-9_-]{6,16}$/

export function isServerShareId(id) {
  return Boolean(id && SERVER_ID_PATTERN.test(id) && id.length <= 16)
}
