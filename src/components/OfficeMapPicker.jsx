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
  domain_error: (o) => `카카오 콘솔에 ${o} 도메인을 등록해 주세요.`,
}

export default function OfficeMapPicker({ lat, lng, onPick }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const kakaoRef = useRef(null)
  const [status, setStatus] = useState('loading')

  const pickLat = Number.isFinite(lat) ? lat : DEFAULT_CENTER.lat
  const pickLng = Number.isFinite(lng) ? lng : DEFAULT_CENTER.lng

  useEffect(() => {
    let cancelled = false

    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return
        kakaoRef.current = kakao

        const center = new kakao.maps.LatLng(pickLat, pickLng)
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
          const la = position.getLat()
          const ln = position.getLng()
          onPick(la, ln)
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
          onPick(pickLat, pickLng)
        }

        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        const msg = String(err?.message ?? '')
        if (msg.includes('NO_KEY')) setStatus('no_key')
        else if (msg.includes('DOMAIN')) setStatus('domain_error')
        else setStatus('error')
      })

    return () => {
      cancelled = true
      markerRef.current?.setMap(null)
      mapInstanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once
  }, [])

  useEffect(() => {
    const kakao = kakaoRef.current
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (!kakao || !map || !marker || !Number.isFinite(lat) || !Number.isFinite(lng)) return

    const pos = new kakao.maps.LatLng(lat, lng)
    marker.setPosition(pos)
    map.setCenter(pos)
  }, [lat, lng])

  if (status !== 'ready') {
    const msg =
      status === 'domain_error'
        ? STATUS_MSG.domain_error(getCurrentOrigin())
        : STATUS_MSG[status] ?? STATUS_MSG.error
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-center text-xs text-gray-500">
        {msg}
      </div>
    )
  }

  return (
    <div>
      <div ref={mapRef} className="h-56 w-full overflow-hidden rounded-xl border border-gray-200" />
      <p className="mt-2 text-center text-[11px] text-gray-400">
        지도를 탭하거나 핀을 드래그해서 회사 위치를 지정하세요
      </p>
    </div>
  )
}
