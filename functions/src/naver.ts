export async function getBlogMentionCount(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<number> {
  const url = new URL('https://openapi.naver.com/v1/search/blog.json')
  url.searchParams.set('query', query)
  url.searchParams.set('display', '1')

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!res.ok) return 0

  const data = (await res.json()) as { total?: number }
  return data.total ?? 0
}

export interface BlogEnrichment {
  blogScores: Map<string, number>
}

export async function enrichWithBlogData<T extends { place_name: string }>(
  places: T[],
  clientId: string,
  clientSecret: string,
): Promise<BlogEnrichment> {
  const blogScores = new Map<string, number>()

  await Promise.all(
    places.map(async (place) => {
      const mentions = await getBlogMentionCount(place.place_name, clientId, clientSecret)
      blogScores.set(place.place_name, mentions)
    }),
  )

  return { blogScores }
}
