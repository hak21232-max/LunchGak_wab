import { initializeApp } from 'firebase-admin/app'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { applyCors } from './cors'
import { runRecommendationPipeline, validateRecommendRequest } from './pipeline'
import { loadShareResult as readShareResult, saveShareResult as persistShareResult, validateSharePayload } from './share'

initializeApp()

const kakaoKey = defineSecret('KAKAO_REST_API_KEY')
const naverCid = defineSecret('NAVER_CLIENT_ID')
const naverSecret = defineSecret('NAVER_CLIENT_SECRET')
const owKey = defineSecret('OPENWEATHER_API_KEY')
const geminiKey = defineSecret('GEMINI_API_KEY')
const dataGoKrKey = defineSecret('DATA_GO_KR_SERVICE_KEY')

const secrets = [kakaoKey, naverCid, naverSecret, owKey, geminiKey, dataGoKrKey]

export const getRecommendation = onRequest(
  {
    region: 'asia-northeast3',
    secrets,
    timeoutSeconds: 60,
    memory: '512MiB',
    cors: false,
  },
  async (req, res) => {
    if (applyCors(req, res)) return

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST만 지원해요.' })
      return
    }

    try {
      const payload = validateRecommendRequest(req.body)
      const result = await runRecommendationPipeline(payload, {
        kakaoRestApiKey: kakaoKey.value(),
        naverClientId: naverCid.value(),
        naverClientSecret: naverSecret.value(),
        openWeatherApiKey: owKey.value(),
        geminiApiKey: geminiKey.value(),
        dataGoKrServiceKey: dataGoKrKey.value(),
      })

      res.status(200).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '추천 처리 중 오류가 발생했어요.'
      res.status(400).json({ error: message })
    }
  },
)

export const saveShareResult = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 15,
    memory: '256MiB',
    cors: false,
  },
  async (req, res) => {
    if (applyCors(req, res)) return

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST만 지원해요.' })
      return
    }

    try {
      const payload = validateSharePayload(req.body)
      const id = await persistShareResult(payload)
      res.status(200).json({ id })
    } catch (err) {
      const message = err instanceof Error ? err.message : '공유 저장 중 오류가 발생했어요.'
      res.status(400).json({ error: message })
    }
  },
)

export const getShareResult = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 15,
    memory: '256MiB',
    cors: false,
  },
  async (req, res) => {
    if (applyCors(req, res)) return

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'GET만 지원해요.' })
      return
    }

    const id = typeof req.query.id === 'string' ? req.query.id : ''
    if (!id) {
      res.status(400).json({ error: '공유 ID가 필요해요.' })
      return
    }

    try {
      const result = await readShareResult(id)
      res.status(200).json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '공유 결과를 불러오지 못했어요.'
      res.status(404).json({ error: message })
    }
  },
)
