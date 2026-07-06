import { useEffect, useRef, useState } from 'react'
import { getCurrentOrigin, loadKakaoMap } from '../utils/loadKakaoMap'
import { buildKakaoPlaceUrl } from '../utils/normalizePick'

const RANK_COLORS = {
  1: '#C9A84C',
  2: '#9CA3AF',
  3: '#92400E',
}

const RANK_SIZES = { 1: 36, 2: 28, 3: 28 }
const RANK_Z_INDEX = { 1: 30, 2: 20, 3: 15 }

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

/** 겹치는 마커를 살짝 벌려서 1위 라벨이 가려지지 않게 */
function spreadPosition(lat, lng, rank, usedPositions) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  const count = usedPositions.get(key) ?? 0
  usedPositions.set(key, count + 1)

  if (count === 0) return { lat, lng }

  const step = 0.00004
  const angle = ((rank - 1) * 120 + count * 45) * (Math.PI / 180)
  return {
    lat: lat + Math.sin(angle) * step * count,
    lng: lng + Math.cos(angle) * step * count,
  }
}

export default function KakaoMap({ picks, userLat, userLng, onStatusChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlaysRef = useRef([])
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
          overlaysRef.current.forEach(({ marker, infowindow, onMarkerClick }) => {
            if (onMarkerClick) {
              kakao.maps.event.removeListener(marker, 'click', onMarkerClick)
            }
            marker.setMap(null)
            infowindow?.close()
          })
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
          const bounds = new kakao.maps.LatLngBounds()
          bounds.extend(center)

          const userMarker = new kakao.maps.Marker({
            position: center,
            map,
            image: createCircleMarkerImage(kakao, USER_COLOR, 24),
            zIndex: 5,
          })
          overlaysRef.current.push({ marker: userMarker, infowindow: null })

          const mapPicks = picks.filter((pick) => isValidCoord(pick.lat, pick.lng))
          const usedPositions = new Map()
          let rankOneOverlay = null

          mapPicks.forEach((pick) => {
            const spread = spreadPosition(pick.lat, pick.lng, pick.rank, usedPositions)
            const position = new kakao.maps.LatLng(spread.lat, spread.lng)
            bounds.extend(position)

            const color = RANK_COLORS[pick.rank] ?? '#6B7280'
            const size = RANK_SIZES[pick.rank] ?? 28
            const marker = new kakao.maps.Marker({
              position,
              map,
              image: createCircleMarkerImage(kakao, color, size),
              zIndex: RANK_Z_INDEX[pick.rank] ?? 10,
            })

            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="padding:8px 10px;font-size:12px;white-space:nowrap;font-weight:600;">${pick.rank}위 ${pick.name} · 도보 ${pick.walk_min}분</div>`,
            })

            const onMarkerClick = () => {
              overlaysRef.current.forEach(({ infowindow: iw }) => iw?.close())
              infowindow.open(map, marker)
            }

            kakao.maps.event.addListener(marker, 'click', onMarkerClick)

            const overlay = { marker, infowindow, onMarkerClick }
            overlaysRef.current.push(overlay)

            if (pick.rank === 1) rankOneOverlay = overlay
          })

          map.setBounds(bounds)

          if (rankOneOverlay) {
            setTimeout(() => {
              if (!cancelled) rankOneOverlay.infowindow.open(map, rankOneOverlay.marker)
            }, 300)
          }

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
      overlaysRef.current.forEach(({ marker, infowindow, onMarkerClick }) => {
        if (onMarkerClick && window.kakao?.maps?.event) {
          window.kakao.maps.event.removeListener(marker, 'click', onMarkerClick)
        }
        marker.setMap(null)
        infowindow?.close()
      })
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
