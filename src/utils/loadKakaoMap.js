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

function waitForMapReady(timeoutMs = 20000) {
  if (isMapReady()) {
    return Promise.resolve(window.kakao)
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    let settled = false

    function finish(resolveOrReject, value) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      clearInterval(poll)
      resolveOrReject(value)
    }

    const timeout = setTimeout(() => {
      if (window.kakao?.maps && !isMapReady()) {
        finish(reject, new Error('DOMAIN_ERROR'))
      } else {
        finish(reject, new Error('TIMEOUT'))
      }
    }, timeoutMs)

    const poll = setInterval(() => {
      if (isMapReady()) {
        finish(resolve, window.kakao)
      } else if (
        window.kakao?.maps &&
        Date.now() - startedAt > 8000 &&
        !isMapReady()
      ) {
        finish(reject, new Error('DOMAIN_ERROR'))
      }
    }, 100)

    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(() => {
        if (isMapReady()) {
          finish(resolve, window.kakao)
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`
    script.async = true
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

export function getCurrentOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}
