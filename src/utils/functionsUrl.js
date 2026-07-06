export function resolveFunctionsBase() {
  const raw = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL?.trim()
  if (!raw || raw.includes('YOUR_PROJECT')) return null
  if (raw.includes('console.firebase.google.com')) {
    throw new Error(
      'Functions URL이 잘못됐어요. Firebase 콘솔 주소가 아니라 Cloud Functions URL을 넣어주세요.',
    )
  }
  if (!raw.startsWith('https://')) {
    throw new Error('Functions URL은 https:// 로 시작해야 해요.')
  }
  const base = raw.replace(/\/$/, '').replace(/\/getRecommendation$/, '')
  return base
}

export function resolveFunctionUrl(functionName) {
  const base = resolveFunctionsBase()
  if (!base) return null
  return `${base}/${functionName}`
}
