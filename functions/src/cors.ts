import type { Request, Response } from 'express'

export const ALLOWED_ORIGINS = [
  'https://lunchgak-wab.pages.dev',
  'http://localhost:5173',
]

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // Cloudflare Pages preview/production (*.lunchgak-wab.pages.dev)
  if (/^https:\/\/([a-z0-9-]+\.)*lunchgak-wab\.pages\.dev$/.test(origin)) {
    return true
  }
  return false
}

export function applyCors(req: Request, res: Response): boolean {
  const origin = req.headers.origin
  if (origin && isAllowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return true
  }
  return false
}
