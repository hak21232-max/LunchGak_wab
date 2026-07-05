import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PLACEHOLDER_KEYS = new Set(['', 'YOUR_KAKAO_JS_KEY', 'KAKAO_JS_KEY_HERE'])

function injectKakaoMapScript(html, kakaoKey) {
  if (!kakaoKey || PLACEHOLDER_KEYS.has(kakaoKey)) return html

  const script = `<script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false"><\/script>`
  return html.replace(
    '<title>lunchgak</title>',
    `<title>lunchgak</title>\n    ${script}`,
  )
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const kakaoKey = env.VITE_KAKAO_JS_KEY?.trim()

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-kakao-map',
        transformIndexHtml(html) {
          return injectKakaoMapScript(html, kakaoKey)
        },
      },
    ],
  }
})
