import { useEffect, useRef, useState } from 'react'
import { getCurrentOrigin, loadKakaoMap } from '../utils/loadKakaoMap'

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }
const OFFICE_COLOR = '#C9A84C'

function createMarkerImage(kakao, color, size = 36) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = '#1B2A4A'
  ctx.lineWidth = 3
  ctx.stroke()
  return new kakao.maps.MarkerImage(
    canvas.toDataURL(),
    new kakao.maps.Size(size, size),
    { offset: new kakao.maps.Point(size / 2, size / 2) },
  )
}

const STATUS_MSG = {
  loading: '지도 불러오는 중...',
  no_key: 'VITE_KAKAO_JS_KEY 설정 후 재배포해 주세요.',
  error: '카카오맵을 불러오지 못했어요.',
  timeout: '지도 로드 시간 초과 — 네트워크를 확인해 주세요.',
  script_error: '지도 스크립트 차단 — 광고차단을 확인해 주세요.',
  domain_error: (o) => `카카오 콘솔 Web 도메인에 ${o} 등록이 필요해요.`,
  init_error: '지도 초기화에 실패했어요.',
}

export default function OfficeMapPicker({ lat, lng, onPick }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const kakaoRef = useRef(null)
  const onPickRef = useRef(onPick)
  const [status, setStatus] = useState('loading')

  onPickRef.current = onPick

  const initialLat = Number.isFinite(lat) ? lat : DEFAULT_CENTER.lat
  const initialLng = Number.isFinite(lng) ? lng : DEFAULT_CENTER.lng

  useEffect(() => {
    let cancelled = false

    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return

        try {
          kakaoRef.current = kakao

          const center = new kakao.maps.LatLng(initialLat, initialLng)
          const map = new kakao.maps.Map(mapRef.current, {
            center,
            level: 3,
          })
          mapInstanceRef.current = map

          const marker = new kakao.maps.Marker({
            position: center,
            map,
            draggable: true,
            image: createMarkerImage(kakao, OFFICE_COLOR),
          })
          markerRef.current = marker

          function emitPosition(position) {
            onPickRef.current(position.getLat(), position.getLng())
          }

          kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
            const pos = mouseEvent.latLng
            marker.setPosition(pos)
            emitPosition(pos)
          })

          kakao.maps.event.addListener(marker, 'dragend', () => {
            emitPosition(marker.getPosition())
          })

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            onPickRef.current(initialLat, initialLng)
          }

          map.relayout()
          setStatus('ready')
        } catch {
          if (!cancelled) setStatus('init_error')
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
        setStatus(statusMap[String(err?.message ?? '')] ?? 'error')
      })

    return () => {
      cancelled = true
      markerRef.current?.setMap(null)
      markerRef.current = null
      mapInstanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once per mount
  }, [])

  useEffect(() => {
    const kakao = kakaoRef.current
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (!kakao || !map || !marker || !Number.isFinite(lat) || !Number.isFinite(lng)) return

    const pos = new kakao.maps.LatLng(lat, lng)
    marker.setPosition(pos)
    map.setCenter(pos)
    map.relayout()
  }, [lat, lng])

  const isFatal = status !== 'ready' && status !== 'loading'
  if (isFatal) {
    const msg =
      status === 'domain_error'
        ? STATUS_MSG.domain_error(getCurrentOrigin())
        : STATUS_MSG[status] ?? STATUS_MSG.error
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-center text-xs text-gray-500">
        🗺️ {msg}
      </div>
    )
  }

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl border border-gray-200">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 text-xs text-gray-500">
          {STATUS_MSG.loading}
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
      {status === 'ready' && (
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-400">
          탭 또는 드래그로 핀 이동
        </p>
      )}
    </div>
  )
}
