import { useEffect, useRef, useState } from 'react'
import { loadKakaoMap } from '../utils/loadKakaoMap'

const RANK_COLORS = {
  1: '#C9A84C',
  2: '#9CA3AF',
  3: '#92400E',
}

const USER_COLOR = '#3B82F6'

const MAP_MESSAGES = {
  loading: '지도 불러오는 중...',
  no_key: '카카오맵 API 키가 없어요 (.env의 VITE_KAKAO_JS_KEY 확인)',
  error: '카카오맵 SDK 로드 실패 (키·도메인 설정 확인)',
  timeout: '카카오맵 로드 시간 초과 — 네트워크·광고차단 확인',
  script_error: '카카오맵 SDK 스크립트 차단됨 — 광고차단·브라우저 확장 확인',
  init_error: '카카오맵 초기화 실패 — JS키·도메인(localhost) 등록 확인',
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
          overlaysRef.current.forEach(({ marker, infowindow }) => {
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
            image: createCircleMarkerImage(kakao, USER_COLOR),
            zIndex: 10,
          })
          overlaysRef.current.push({ marker: userMarker, infowindow: null })

          picks.forEach((pick) => {
            const position = new kakao.maps.LatLng(pick.lat, pick.lng)
            bounds.extend(position)

            const color = RANK_COLORS[pick.rank] ?? '#6B7280'
            const marker = new kakao.maps.Marker({
              position,
              map,
              image: createCircleMarkerImage(kakao, color),
            })

            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="padding:8px 10px;font-size:12px;white-space:nowrap;">${pick.rank}위 ${pick.name} · 도보 ${pick.walk_min}분</div>`,
            })

            kakao.maps.event.addListener(marker, 'click', () => {
              overlaysRef.current.forEach(({ infowindow: iw }) => iw?.close())
              infowindow.open(map, marker)
            })

            overlaysRef.current.push({ marker, infowindow })
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
        }
        updateStatus(statusMap[err.message] ?? 'error')
      })

    return () => {
      cancelled = true
      overlaysRef.current.forEach(({ marker, infowindow }) => {
        marker.setMap(null)
        infowindow?.close()
      })
      overlaysRef.current = []
    }
  }, [picks, userLat, userLng])

  if (mapStatus !== 'ready' && mapStatus !== 'loading') {
    return (
      <div className="mb-4 flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 text-center text-sm text-gray-500">
        <span>🗺️ {MAP_MESSAGES[mapStatus]}</span>
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
