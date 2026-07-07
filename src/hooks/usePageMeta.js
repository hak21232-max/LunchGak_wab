import { useEffect } from 'react'

const SITE_NAME = '런치각 LunchGAK'
const DEFAULT_DESC =
  '직장인 점심·회식 맛집 추천 서비스. 6가지 질문(점심/저녁·자리·기분·음식·거리·예산)에 답하면 GPS·날씨·블로그 후기를 반영해 근처 맛집 3곳을 추천해 드립니다.'

export function usePageMeta({ title, description = DEFAULT_DESC, path = '', noindex = false }) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description

    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = noindex ? 'noindex, nofollow' : 'index, follow'

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    const origin = window.location.origin
    canonical.href = path ? `${origin}${path}` : origin
  }, [title, description, path, noindex])
}

export { SITE_NAME, DEFAULT_DESC }
