let loadPromise = null

const PLACEHOLDER_KEYS = new Set([
  '',
  'YOUR_KAKAO_JS_KEY',
  'KAKAO_JS_KEY_HERE',
])

export function getKakaoMapKey() {
  const key = import.meta.env.VITE_KAKAO_JS_KEY?.trim()
  if (!key || PLACEHOLDER_KEYS.has(key)) return null
  return key
}

function isMapReady() {
  return typeof window.kakao?.maps?.Map === 'function'
}

function waitForMapReady(timeoutMs = 15000) {
  if (isMapReady()) {
    return Promise.resolve(window.kakao)
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(poll)
      reject(new Error('TIMEOUT'))
    }, timeoutMs)

    const poll = setInterval(() => {
      if (isMapReady()) {
        clearTimeout(timeout)
        clearInterval(poll)
        resolve(window.kakao)
      }
    }, 50)

    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => {
        if (isMapReady()) {
          clearTimeout(timeout)
          clearInterval(poll)
          resolve(window.kakao)
        }
      })
    }
  })
}

function injectScript(key) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="dapi.kakao.com/v2/maps/sdk.js"]',
    )
    if (existing) {
      waitForMapReady().then(resolve).catch(reject)
      return
    }

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services`
    script.async = false
    script.onload = () => waitForMapReady().then(resolve).catch(reject)
    script.onerror = () => reject(new Error('SCRIPT_ERROR'))
    document.head.appendChild(script)
  })
}

export function loadKakaoMap() {
  const key = getKakaoMapKey()
  if (!key) {
    return Promise.reject(new Error('NO_KEY'))
  }

  if (isMapReady()) {
    return Promise.resolve(window.kakao)
  }

  if (loadPromise) return loadPromise

  loadPromise = injectScript(key).catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}
