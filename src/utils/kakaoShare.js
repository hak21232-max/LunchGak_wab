import { getKakaoMapKey } from './loadKakaoMap'

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
const SHARE_IMAGE_URL =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=640&fit=crop'

let sdkPromise = null

function truncate(text, max) {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function getShareUrl() {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://lunchgak-wab.pages.dev'
  return `${origin}/location`
}

function buildKakaoDescription(data) {
  const parts = [data.greeting, data.recommendation_reason].filter(Boolean)
  return truncate(parts.join(' · '), 200)
}

export function loadKakaoSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('NO_WINDOW'))
  }

  if (window.Kakao?.Share) {
    const key = getKakaoMapKey()
    if (!key) return Promise.reject(new Error('NO_KEY'))
    if (!window.Kakao.isInitialized()) window.Kakao.init(key)
    return Promise.resolve(window.Kakao)
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const key = getKakaoMapKey()
      if (!key) {
        reject(new Error('NO_KEY'))
        return
      }

      const script = document.createElement('script')
      script.src = KAKAO_SDK_URL
      script.crossOrigin = 'anonymous'
      script.onload = () => {
        if (!window.Kakao) {
          reject(new Error('SDK_LOAD_FAILED'))
          return
        }
        window.Kakao.init(key)
        resolve(window.Kakao)
      }
      script.onerror = () => reject(new Error('SDK_LOAD_FAILED'))
      document.head.appendChild(script)
    })
  }

  return sdkPromise
}

export async function shareToKakaoTalk(data) {
  const Kakao = await loadKakaoSdk()
  const shareUrl = getShareUrl()
  const picks = (data.picks ?? []).slice(0, 3)

  await Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: truncate(data.greeting || '런치각 점심 추천', 50),
      description: buildKakaoDescription(data),
      imageUrl: SHARE_IMAGE_URL,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    itemContent: {
      profileText: '런치각',
      titleImageText: '오늘의 추천',
      titleImageCategory: 'FOOD',
      items: picks.map((pick) => ({
        item: truncate(pick.name, 40),
        itemOp: `도보 ${pick.walk_min}분`,
      })),
    },
    buttons: [
      {
        title: '나도 추천 받기',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
    installTalk: true,
  })

  return { ok: true, method: 'kakao' }
}
