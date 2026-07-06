import { createContext, useCallback, useContext, useState } from 'react'
import {
  clearSavedOffice,
  loadLocationMode,
  loadSavedOffice,
  saveOfficeLocation,
  setLocationMode,
} from '../utils/savedOffice'

const FALLBACK = { lat: 37.2636, lng: 127.0632 }

function getFailReason(code) {
  if (code === 1) return '위치 권한이 거부됨'
  if (code === 2) return '위치 정보를 사용할 수 없음'
  if (code === 3) return '위치 확인 시간 초과'
  return '알 수 없는 오류'
}

const LocationContext = createContext(null)

function getInitialOfficeState() {
  const savedOffice = loadSavedOffice()
  const mode = loadLocationMode()
  if (mode === 'office' && savedOffice) {
    return {
      savedOffice,
      lat: savedOffice.lat,
      lng: savedOffice.lng,
      locationSource: 'office',
    }
  }
  return { savedOffice, lat: null, lng: null, locationSource: null }
}

export function LocationProvider({ children }) {
  const initialOffice = getInitialOfficeState()
  const [lat, setLat] = useState(initialOffice.lat)
  const [lng, setLng] = useState(initialOffice.lng)
  const [loading, setLoading] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [failReason, setFailReason] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [locationSource, setLocationSource] = useState(initialOffice.locationSource)
  const [savedOffice, setSavedOfficeState] = useState(initialOffice.savedOffice)

  const applyOffice = useCallback((office) => {
    setLat(office.lat)
    setLng(office.lng)
    setIsFallback(false)
    setFailReason(null)
    setAccuracy(null)
    setLocationSource('office')
    setLoading(false)
  }, [])

  const fetchGps = useCallback(() => {
    setLoading(true)
    setFailReason(null)
    setLocationSource('gps')
    setLocationMode('gps')

    if (!navigator.geolocation) {
      setLat(FALLBACK.lat)
      setLng(FALLBACK.lng)
      setIsFallback(true)
      setFailReason('브라우저가 위치 서비스를 지원하지 않음')
      setAccuracy(null)
      setLoading(false)
      return () => {}
    }

    let cancelled = false

    function applySuccess(position) {
      if (cancelled) return
      setLat(position.coords.latitude)
      setLng(position.coords.longitude)
      setAccuracy(position.coords.accuracy ?? null)
      setIsFallback(false)
      setFailReason(null)
      setLoading(false)
    }

    function applyFallback(err) {
      if (cancelled) return
      setLat(FALLBACK.lat)
      setLng(FALLBACK.lng)
      setIsFallback(true)
      setFailReason(getFailReason(err?.code))
      setAccuracy(null)
      setLoading(false)
    }

    function tryLowAccuracy() {
      navigator.geolocation.getCurrentPosition(applySuccess, applyFallback, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      })
    }

    navigator.geolocation.getCurrentPosition(
      applySuccess,
      (err) => {
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          tryLowAccuracy()
        } else {
          applyFallback(err)
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )

    return () => {
      cancelled = true
    }
  }, [])

  const retry = useCallback(() => {
    fetchGps()
  }, [fetchGps])

  const setOfficeFromMap = useCallback(
    (officeLat, officeLng, label = '회사') => {
      const office = saveOfficeLocation(officeLat, officeLng, label)
      setSavedOfficeState(office)
      applyOffice(office)
      return office
    },
    [applyOffice],
  )

  const useGpsLocation = useCallback(() => {
    return fetchGps()
  }, [fetchGps])

  const clearOfficeLocation = useCallback(() => {
    clearSavedOffice()
    setSavedOfficeState(null)
    setLat(null)
    setLng(null)
    setLocationSource(null)
  }, [])

  return (
    <LocationContext.Provider
      value={{
        lat,
        lng,
        loading,
        isFallback,
        failReason,
        accuracy,
        locationSource,
        savedOffice,
        setOfficeFromMap,
        useGpsLocation,
        clearOfficeLocation,
        retry,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
