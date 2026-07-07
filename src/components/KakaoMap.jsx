import { useEffect, useRef, useState } from 'react'
import { getCurrentOrigin, loadKakaoMap } from '../utils/loadKakaoMap'
import { buildKakaoPlaceUrl } from '../utils/normalizePick'

const RANK_COLORS = {
  1: '#C9A84C',
  2: '#9CA3AF',
  3: '#92400E',
}

const RANK_SIZES = { 1: 24, 2: 18, 3: 18 }
const RANK_Z_INDEX = { 1: 40, 2: 25, 3: 20 }

const USER_COLOR = '#3B82F6'

const MAP_MESSAGES = {
  loading: '지도 불러오는 중...',
  no_key:
    '카카오 JS 키 없음 — Cloudflare Pages 환경변수 VITE_KAKAO_JS_KEY 확인 후 재배포',
  error: '카카오맵 SDK 로드 실패',
  timeout: '카카오맵 로드 시간 초과 — 네트워크·광고차단 확인',
  script_error: '카카오맵 SDK 스크립트 차단됨 — 광고차단·확장 프로그램 확인',
  init_error: '카카오맵 초기화 실패',
  domain_error: (origin) =>
    `도메인 미등록 — 카카오 개발자 콘솔 Web 플랫폼에 ${origin} 추가`,
}

function createCircleMarkerImage(kakao, color, size = 28) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()
  return new kakao.maps.MarkerImage(
    canvas.toDataURL(),
    new kakao.maps.Size(size, size),
    { offset: new kakao.maps.Point(size / 2, size / 2) },
  )
}

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** 겹치는 마커·GPS와 너무 가까운 1위를 벌림 */
function resolveMarkerPosition(lat, lng, rank, userLat, userLng, usedPositions) {
  let resolvedLat = lat
  let resolvedLng = lng

  if (rank === 1 && haversineM(userLat, userLng, lat, lng) < 50) {
    resolvedLat += 0.00014
    resolvedLng += 0.0001
  }

  const key = `${resolvedLat.toFixed(4)},${resolvedLng.toFixed(4)}`
  const count = usedPositions.get(key) ?? 0
  usedPositions.set(key, count + 1)

  if (count > 0) {
    const step = 0.0001
    const angle = ((rank - 1) * 130 + count * 50) * (Math.PI / 180)
    resolvedLat += Math.sin(angle) * step * count
    resolvedLng += Math.cos(angle) * step * count
  }

  return { lat: resolvedLat, lng: resolvedLng }
}

function createPopupOverlay(kakao, pick, color) {
  const el = document.createElement('div')
  el.style.cssText = [
    'padding:6px 10px',
    'border-radius:8px',
    'background:#fff',
    'color:#1B2A4A',
    'font-size:11px',
    'font-weight:700',
    'white-space:nowrap',
    `border:2px solid ${color}`,
    'box-shadow:0 2px 8px rgba(0,0,0,.15)',
  ].join(';')
  el.textContent = `${pick.rank}위 ${pick.name} · 도보 ${pick.walk_min}분`

  return new kakao.maps.CustomOverlay({
    content: el,
    yAnchor: 2.2,
    zIndex: (RANK_Z_INDEX[pick.rank] ?? 15) + 10,
  })
}

function closeAllPopups(overlays) {
  overlays.forEach(({ popup }) => popup?.setMap(null))
}

function clearOverlays(kakao, overlays) {
  overlays.forEach(({ marker, popup, onMarkerClick }) => {
    if (onMarkerClick && kakao?.maps?.event) {
      kakao.maps.event.removeListener(marker, 'click', onMarkerClick)
    }
    popup?.setMap(null)
    marker?.setMap(null)
  })
}

export default function KakaoMap({ picks, userLat, userLng, onStatusChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const kakaoRef = useRef(null)
  const overlaysRef = useRef([])
  const onMapClickRef = useRef(null)
  const [mapStatus, setMapStatus] = useState('loading')

  function updateStatus(status) {
    setMapStatus(status)
    onStatusChange?.(status)
  }

  useEffect(() => {
    if (userLat == null || userLng == null || !picks?.length) return

    let cancelled = false
    updateStatus('loading')

    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return

        try {
          kakaoRef.current = kakao
          clearOverlays(kakao, overlaysRef.current)
          overlaysRef.current = []

          const center = new kakao.maps.LatLng(userLat, userLng)

          if (!mapInstanceRef.current) {
            mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
              center,
              level: 4,
            })
          } else {
            mapInstanceRef.current.setCenter(center)
          }

          const map = mapInstanceRef.current

          if (onMapClickRef.current) {
            kakao.maps.event.removeListener(map, 'click', onMapClickRef.current)
          }
          onMapClickRef.current = () => closeAllPopups(overlaysRef.current)
          kakao.maps.event.addListener(map, 'click', onMapClickRef.current)

          const bounds = new kakao.maps.LatLngBounds()
          bounds.extend(center)

          const userMarker = new kakao.maps.Marker({
            position: center,
            map,
            image: createCircleMarkerImage(kakao, USER_COLOR, 16),
            zIndex: 5,
          })
          overlaysRef.current.push({ marker: userMarker })

          const mapPicks = [...picks]
            .filter((pick) => isValidCoord(pick.lat, pick.lng))
            .sort((a, b) => a.rank - b.rank)

          const usedPositions = new Map()

          mapPicks.forEach((pick) => {
            const spread = resolveMarkerPosition(
              pick.lat,
              pick.lng,
              pick.rank,
              userLat,
              userLng,
              usedPositions,
            )
            const position = new kakao.maps.LatLng(spread.lat, spread.lng)
            bounds.extend(position)

            const color = RANK_COLORS[pick.rank] ?? '#6B7280'
            const size = RANK_SIZES[pick.rank] ?? 18
            const marker = new kakao.maps.Marker({
              position,
              map,
              image: createCircleMarkerImage(kakao, color, size),
              zIndex: RANK_Z_INDEX[pick.rank] ?? 10,
            })

            const popup = createPopupOverlay(kakao, pick, color)

            const onMarkerClick = () => {
              closeAllPopups(overlaysRef.current)
              popup.setPosition(position)
              popup.setMap(map)
            }

            kakao.maps.event.addListener(marker, 'click', onMarkerClick)

            overlaysRef.current.push({ marker, popup, onMarkerClick })
          })

          map.setBounds(bounds)
          updateStatus('ready')
        } catch {
          updateStatus('init_error')
        }
      })
      .catch((err) => {
        if (cancelled) return
        const statusMap = {
          NO_KEY: 'no_key',
          TIMEOUT: 'timeout',
          SCRIPT_ERROR: 'script_error',
          DOMAIN_ERROR: 'domain_error',
        }
        updateStatus(statusMap[err.message] ?? 'error')
      })

    return () => {
      cancelled = true
      const kakao = kakaoRef.current
      if (kakao && mapInstanceRef.current && onMapClickRef.current) {
        kakao.maps.event.removeListener(mapInstanceRef.current, 'click', onMapClickRef.current)
        onMapClickRef.current = null
      }
      clearOverlays(kakao, overlaysRef.current)
      overlaysRef.current = []
    }
  }, [picks, userLat, userLng])

  if (mapStatus !== 'ready' && mapStatus !== 'loading') {
    const message =
      mapStatus === 'domain_error'
        ? MAP_MESSAGES.domain_error(getCurrentOrigin())
        : MAP_MESSAGES[mapStatus]
    const fallbackUrl = picks?.[0] ? buildKakaoPlaceUrl(picks[0]) : ''

    return (
      <div className="mb-4 flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 text-center text-sm text-gray-500">
        <span>🗺️ {message}</span>
        {fallbackUrl && (
          <button
            type="button"
            onClick={() => window.open(fallbackUrl, '_blank', 'noopener,noreferrer')}
            className="text-xs text-primary underline"
          >
            카카오맵에서 1위 맛집 보기
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative mb-4 h-56 w-full overflow-hidden rounded-2xl">
      {mapStatus === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 text-sm text-gray-500">
          {MAP_MESSAGES.loading}
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
